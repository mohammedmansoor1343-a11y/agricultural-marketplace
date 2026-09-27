"""Rule-based produce aggregation ("AI-based" grouping with transparent rules).

Rules (documented in the UI):
1. Only VERIFIED listings are eligible.
2. Listings are grouped by crop name.
3. Within a crop, listings are clustered into pickup-location groups using
   fuzzy village/location compatibility (shared-token/prefix matching).
4. Availability windows must overlap (same available_from week).
5. When a group's total verified quantity reaches the configured threshold
   (default 200 kg), a bulk lot is created and each farmer contribution is
   recorded in bulk_lot_listings.
6. Quantities already allocated to another lot are never double-counted
   (remaining_kg bookkeeping + listing status transitions).
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    BulkLot,
    BulkLotListing,
    Farmer,
    ListingStatus,
    LotStatus,
    ProduceListing,
    User,
)
from app.services.platform import get_aggregation_threshold, get_platform_fee_per_kg


def _location_tokens(location: str) -> set[str]:
    return {t for t in location.lower().replace(",", " ").split() if len(t) > 2}


def locations_compatible(a: str, b: str) -> bool:
    """Fuzzy village/location matching: shared tokens or strong prefix overlap."""
    ta, tb = _location_tokens(a), _location_tokens(b)
    if ta & tb:
        return True
    for x in ta:
        for y in tb:
            if len(x) >= 4 and len(y) >= 4 and (x.startswith(y) or y.startswith(x)):
                return True
    return False


def _week_of(date_str: str) -> str:
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
    except ValueError:
        return date_str[:10]
    monday = d - timedelta_compat(days=d.weekday())
    return monday.strftime("%Y-%m-%d")


def timedelta_compat(days: int):
    from datetime import timedelta

    return timedelta(days=days)


def preview_aggregation(db: Session) -> dict:
    """Return candidate groups with threshold status without mutating data."""
    threshold = get_aggregation_threshold(db)
    listings = db.scalars(
        select(ProduceListing).where(ProduceListing.status == ListingStatus.verified)
    ).all()

    groups: dict[tuple, list[ProduceListing]] = {}
    for l in listings:
        placed = False
        for key in list(groups.keys()):
            crop, loc, week = key
            if crop == l.crop_name and week == _week_of(l.available_from) and locations_compatible(loc, l.pickup_location):
                groups[key].append(l)
                placed = True
                break
        if not placed:
            groups[(l.crop_name, l.pickup_location, _week_of(l.available_from))] = [l]

    out = []
    for (crop, loc, week), items in groups.items():
        total = float(sum(float(i.verified_weight_kg or i.quantity_kg) for i in items))
        out.append(
            {
                "crop_name": crop,
                "village_group": loc,
                "total_verified_kg": round(total, 2),
                "listing_ids": [i.id for i in items],
                "meets_threshold": total >= threshold,
            }
        )
    out.sort(key=lambda g: (not g["meets_threshold"], -g["total_verified_kg"]))
    return {"threshold_kg": threshold, "groups": out}


def run_aggregation(db: Session) -> dict:
    """Create bulk lots from verified listings whose groups meet the threshold."""
    threshold = get_aggregation_threshold(db)
    fee = get_platform_fee_per_kg(db)

    # Snapshot verified listings; skip fully-allocated ones defensively.
    listings = [
        l
        for l in db.scalars(
            select(ProduceListing).where(ProduceListing.status == ListingStatus.verified)
        ).all()
        if float(l.remaining_kg) > 0
    ]

    groups: dict[tuple, list[ProduceListing]] = {}
    for l in listings:
        placed = False
        for key in list(groups.keys()):
            crop, loc, week = key
            if crop == l.crop_name and week == _week_of(l.available_from) and locations_compatible(loc, l.pickup_location):
                groups[key].append(l)
                placed = True
                break
        if not placed:
            groups[(l.crop_name, l.pickup_location, _week_of(l.available_from))] = [l]

    created: list[BulkLot] = []
    below: list[dict] = []
    seq = (db.query(BulkLot).count() or 0) + 1

    for (crop, loc, _week), items in groups.items():
        # Compute allocatable quantity per listing (remaining may be partial).
        plan = []
        total = 0.0
        for l in items:
            avail = float(l.remaining_kg)
            if avail <= 0:
                continue
            plan.append((l, avail))
            total += avail

        if total < threshold:
            below.append(
                {
                    "crop_name": crop,
                    "village_group": loc,
                    "total_verified_kg": round(total, 2),
                    "listing_ids": [l.id for l in items],
                    "meets_threshold": False,
                }
            )
            continue

        # Weighted average of farmer expected prices for the fair lot price.
        weighted_price = sum(float(l.expected_price_per_kg) * a for l, a in plan) / total
        lot = BulkLot(
            lot_code=f"LOT-{datetime.now(timezone.utc).year}-{seq:04d}",
            crop_name=crop,
            total_quantity_kg=round(total, 2),
            remaining_kg=round(total, 2),
            farmer_count=len({l.farmer_id for l, _ in plan}),
            pickup_location=loc,
            available_from=min(l.available_from for l, _ in plan),
            price_per_kg=round(weighted_price, 2),
            transport_cost_per_kg=estimate_transport_per_kg(15.0, 2.0),  # demo: ~15 km route
            platform_fee_per_kg=round(fee, 2),
            status=LotStatus.ready,
        )
        seq += 1
        db.add(lot)
        db.flush()

        for l, alloc in plan:
            db.add(
                BulkLotListing(
                    lot_id=lot.id,
                    listing_id=l.id,
                    farmer_id=l.farmer_id,
                    allocated_kg=round(alloc, 2),
                    price_per_kg=float(l.expected_price_per_kg),
                )
            )
            l.remaining_kg = 0
            l.status = ListingStatus.aggregated

        created.append(lot)

    db.commit()
    return {"created": created, "below": below}


def estimate_transport_per_kg(distance_km: float, base_cost_per_kg: float = 1.5) -> float:
    """Demo transport pricing: base trip cost spread over the load + per-km cost."""
    settings.TRANSPORT_RATE_PER_KM_PER_KG  # noqa: B018  (documented rate)
    return round(base_cost_per_kg + distance_km * settings.TRANSPORT_RATE_PER_KM_PER_KG, 2)
