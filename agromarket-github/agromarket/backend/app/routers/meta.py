from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import admin_required, any_authenticated
from app.database import get_db
from app.models import (
    BulkLot,
    Delivery,
    DeliveryStatus,
    Driver,
    Farmer,
    ListingStatus,
    LotStatus,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    ProduceListing,
    TrustScore,
    User,
    UserRole,
)
from app.schemas.schemas import SettingsOut, SettingsUpdate
from app.services.platform import (
    KEY_PLATFORM_FEE,
    KEY_THRESHOLD,
    get_aggregation_threshold,
    get_platform_fee_per_kg,
    set_setting,
)
from app.services.forecast import crop_summaries

router = APIRouter()


# --------------------------------------------------------------------------- #
# Platform settings (admin-configurable)
# --------------------------------------------------------------------------- #


@router.get("/settings", response_model=SettingsOut)
def read_settings(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    return SettingsOut(
        aggregation_threshold_kg=get_aggregation_threshold(db),
        platform_fee_per_kg=get_platform_fee_per_kg(db),
        demo_mode=True,
    )


@router.put("/settings", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    if payload.aggregation_threshold_kg is not None:
        set_setting(db, KEY_THRESHOLD, str(payload.aggregation_threshold_kg),
                    "Minimum kg per crop/location group to create a bulk lot")
    if payload.platform_fee_per_kg is not None:
        set_setting(db, KEY_PLATFORM_FEE, str(payload.platform_fee_per_kg),
                    "Platform fee charged per kg to buyers")
    db.commit()
    return SettingsOut(
        aggregation_threshold_kg=get_aggregation_threshold(db),
        platform_fee_per_kg=get_platform_fee_per_kg(db),
        demo_mode=True,
    )


# --------------------------------------------------------------------------- #
# Role dashboards
# --------------------------------------------------------------------------- #


@router.get("/dashboard")
def dashboard(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    role = current_user.role

    if role == UserRole.farmer:
        return _farmer_dashboard(db, current_user)
    if role == UserRole.buyer:
        return _buyer_dashboard(db, current_user)
    if role == UserRole.driver:
        return _driver_dashboard(db, current_user)
    if role == UserRole.coordinator:
        return _coordinator_dashboard(db, current_user)
    return _admin_dashboard(db)


def _farmer_dashboard(db: Session, user: User) -> dict:
    from app.models import BulkLotListing

    farmer = user.farmer_profile
    listings = db.scalars(select(ProduceListing).where(ProduceListing.farmer_id == farmer.id)).all()
    verified = [l for l in listings if l.status in (ListingStatus.verified, ListingStatus.aggregated)]
    lot_ids = set(db.scalars(
        select(BulkLotListing.lot_id).where(BulkLotListing.farmer_id == farmer.id)
    ).all())

    from app.models import Order

    active_lots = len(lot_ids)
    orders = []
    if lot_ids:
        orders = db.scalars(select(Order).where(Order.lot_id.in_(lot_ids))).all()
    active_orders = [o for o in orders if o.status not in (OrderStatus.cancelled, OrderStatus.completed)]

    qty_by_lot: dict = {}

    items = db.scalars(select(BulkLotListing).where(BulkLotListing.farmer_id == farmer.id)).all()
    for it in items:
        qty_by_lot[it.lot_id] = qty_by_lot.get(it.lot_id, 0.0) + float(it.allocated_kg)

    earnings = 0.0
    for o in orders:
        if o.status in (OrderStatus.completed, OrderStatus.delivered):
            share = qty_by_lot.get(o.lot_id, 0.0)
            earnings += share * float(o.farmer_price_per_kg)

    return {
        "cards": [
            {"label": "Total Produce Listings", "value": len(listings), "tone": "green"},
            {"label": "Verified Listings", "value": len(verified), "tone": "emerald"},
            {"label": "Active Bulk Lots", "value": active_lots, "tone": "blue"},
            {"label": "Active Orders", "value": len(active_orders), "tone": "amber"},
            {"label": "Total Earnings (est.)", "value": f"₹{earnings:,.0f}", "tone": "violet"},
        ],
        "extra": {
            "recent_orders": [
                {
                    "order_code": o.order_code,
                    "crop": o.lot.crop_name,
                    "qty": float(o.quantity_kg),
                    "status": o.status,
                    "total": float(o.total_amount),
                }
                for o in sorted(orders, key=lambda x: x.created_at, reverse=True)[:5]
            ]
        },
    }


def _buyer_dashboard(db: Session, user: User) -> dict:
    buyer = user.buyer_profile
    orders = db.scalars(select(Order).where(Order.buyer_id == buyer.id)).all()
    active = [o for o in orders if o.status not in (OrderStatus.cancelled, OrderStatus.completed)]
    completed = [o for o in orders if o.status == OrderStatus.completed]
    ready_lots = db.scalars(
        select(BulkLot).where(BulkLot.status.in_([LotStatus.ready, LotStatus.collecting]))
    ).all()
    total_value = sum(float(o.total_amount) for o in orders if o.status != OrderStatus.cancelled)

    return {
        "cards": [
            {"label": "Available Bulk Lots", "value": len(ready_lots), "tone": "green"},
            {"label": "Active Orders", "value": len(active), "tone": "blue"},
            {"label": "Completed Orders", "value": len(completed), "tone": "emerald"},
            {"label": "Total Purchase Value", "value": f"₹{total_value:,.0f}", "tone": "violet"},
        ],
        "extra": {
            "recent_orders": [
                {
                    "order_code": o.order_code,
                    "crop": o.lot.crop_name,
                    "qty": float(o.quantity_kg),
                    "status": o.status,
                    "total": float(o.total_amount),
                }
                for o in sorted(orders, key=lambda x: x.created_at, reverse=True)[:5]
            ],
            "crop_prices": crop_summaries(db),
        },
    }


def _driver_dashboard(db: Session, user: User) -> dict:
    driver = user.driver_profile
    deliveries = db.scalars(select(Delivery).where(Delivery.driver_id == driver.id)).all()
    available = db.scalars(
        select(Delivery).where(Delivery.status == DeliveryStatus.pending, Delivery.driver_id.is_(None))
    ).all()
    active = [d for d in deliveries if d.status in (
        DeliveryStatus.accepted, DeliveryStatus.at_pickup,
        DeliveryStatus.pickup_confirmed, DeliveryStatus.in_transit,
    )]
    completed = [d for d in deliveries if d.status == DeliveryStatus.completed]
    earnings = sum(float(d.actual_earnings or d.estimated_earnings) for d in completed)

    return {
        "cards": [
            {"label": "Available Jobs", "value": len(available), "tone": "green"},
            {"label": "Active Deliveries", "value": len(active), "tone": "blue"},
            {"label": "Completed Deliveries", "value": len(completed), "tone": "emerald"},
            {"label": "Total Earnings", "value": f"₹{earnings:,.0f}", "tone": "violet"},
        ],
        "extra": {
            "is_available": driver.is_available,
            "active_jobs": [
                {
                    "delivery_code": d.delivery_code,
                    "pickup": d.pickup_location,
                    "drop": d.drop_location,
                    "status": d.status,
                }
                for d in active
            ],
        },
    }


def _coordinator_dashboard(db: Session, user: User) -> dict:
    total_farmers = len(db.scalars(select(Farmer)).all())
    pending = len(db.scalars(select(ProduceListing).where(ProduceListing.status == ListingStatus.pending)).all())
    verified = len(db.scalars(
        select(ProduceListing).where(ProduceListing.status.in_([ListingStatus.verified, ListingStatus.aggregated]))
    ).all())
    total_kg = db.scalar(func.coalesce(func.sum(ProduceListing.verified_weight_kg), 0.0)) or 0

    return {
        "cards": [
            {"label": "Total Registered Farmers", "value": total_farmers, "tone": "green"},
            {"label": "Pending Verifications", "value": pending, "tone": "amber"},
            {"label": "Verified Listings", "value": verified, "tone": "emerald"},
            {"label": "Total Produce Collected", "value": f"{round(float(total_kg)):,} kg", "tone": "blue"},
        ],
        "extra": {},
    }


def _admin_dashboard(db: Session) -> dict:
    users = db.scalars(select(User)).all()
    farmers = sum(1 for u in users if u.role == UserRole.farmer)
    buyers = sum(1 for u in users if u.role == UserRole.buyer)
    drivers = sum(1 for u in users if u.role == UserRole.driver)
    listings = len(db.scalars(select(ProduceListing)).all())
    lots = len(db.scalars(select(BulkLot)).all())
    orders = db.scalars(select(Order)).all()
    active_orders = [o for o in orders if o.status not in (OrderStatus.cancelled, OrderStatus.completed)]
    completed_deliveries = len(db.scalars(select(Delivery).where(Delivery.status == DeliveryStatus.completed)).all())

    return {
        "cards": [
            {"label": "Total Users", "value": len(users), "tone": "green"},
            {"label": "Total Farmers", "value": farmers, "tone": "emerald"},
            {"label": "Total Buyers", "value": buyers, "tone": "blue"},
            {"label": "Total Drivers", "value": drivers, "tone": "amber"},
            {"label": "Produce Listings", "value": listings, "tone": "green"},
            {"label": "Bulk Lots", "value": lots, "tone": "violet"},
            {"label": "Active Orders", "value": len(active_orders), "tone": "blue"},
            {"label": "Completed Deliveries", "value": completed_deliveries, "tone": "emerald"},
        ],
        "extra": {},
    }


# --------------------------------------------------------------------------- #
# Driver vehicles (for job acceptance)
# --------------------------------------------------------------------------- #


@router.get("/drivers/me/vehicles")
def my_vehicles(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    if current_user.driver_profile is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Driver profile required.")
    from app.models import Vehicle

    vehicles = db.scalars(select(Vehicle).where(Vehicle.driver_id == current_user.driver_profile.id)).all()
    return [
        {
            "id": v.id,
            "vehicle_type": v.vehicle_type,
            "registration_number": v.registration_number,
            "capacity_kg": float(v.capacity_kg),
        }
        for v in vehicles
    ]


# --------------------------------------------------------------------------- #
# Reports (admin)
# --------------------------------------------------------------------------- #


@router.get("/reports")
def reports(current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    crop_rows = db.execute(
        select(ProduceListing.crop_name, func.sum(ProduceListing.quantity_kg))
        .group_by(ProduceListing.crop_name)
    ).all()
    order_rows = db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    ).all()
    payment_rows = db.execute(
        select(Payment.status, func.count(Payment.id)).group_by(Payment.status)
    ).all()
    delivery_rows = db.execute(
        select(Delivery.status, func.count(Delivery.id)).group_by(Delivery.status)
    ).all()

    volume_by_crop = [{"name": c or "Unknown", "value": round(float(q or 0), 1)} for c, q in crop_rows]
    orders_by_status = [{"name": (s or "unknown").replace("_", " ").title(), "value": n} for s, n in order_rows]
    payments_by_status = [{"name": (s or "unknown").title(), "value": n} for s, n in payment_rows]
    deliveries_by_status = [{"name": (s or "unknown").replace("_", " ").title(), "value": n} for s, n in delivery_rows]

    total_volume = db.scalar(func.coalesce(func.sum(ProduceListing.quantity_kg), 0.0)) or 0
    total_transactions = db.scalar(func.count(Payment.id)) or 0
    transaction_value = db.scalar(func.coalesce(func.sum(Payment.amount), 0.0)) or 0

    return {
        "produce_volume": {
            "total_kg": round(float(total_volume), 1),
            "by_crop": volume_by_crop,
        },
        "orders_by_status": orders_by_status,
        "payments_by_status": payments_by_status,
        "deliveries_by_status": deliveries_by_status,
        "transaction_activity": {
            "total_transactions": total_transactions,
            "total_value": round(float(transaction_value), 2),
            "note": "Simulated payment records for demonstration — not real money movement.",
        },
    }


# --------------------------------------------------------------------------- #
# Trust scores
# --------------------------------------------------------------------------- #


@router.get("/trust-scores")
def trust_scores(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    rows = db.execute(
        select(TrustScore, User).join(User, TrustScore.user_id == User.id).order_by(TrustScore.score.desc())
    ).all()
    return [
        {
            "user_id": ts.user_id,
            "user_name": u.full_name,
            "role": u.role,
            "score": float(ts.score),
            "completed_transactions": ts.completed_transactions,
            "cancelled_transactions": ts.cancelled_transactions,
            "on_time_deliveries": ts.on_time_deliveries,
            "rating_avg": float(ts.rating_avg) if ts.rating_avg is not None else None,
            "last_updated_reason": ts.last_updated_reason,
        }
        for ts, u in rows
    ]
