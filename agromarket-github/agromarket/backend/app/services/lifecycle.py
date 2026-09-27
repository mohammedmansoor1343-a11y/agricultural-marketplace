"""Shared helpers: codes, distance estimation, order/delivery lifecycle."""
import random
import string
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import (
    BulkLot,
    Delivery,
    DeliveryStatus,
    ListingStatus,
    LotStatus,
    Order,
    OrderStatus,
    OrderStatusEvent,
    Payment,
    ProduceListing,
)


def new_code(prefix: str) -> str:
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%y%m')}-" + "".join(
        random.choices(string.ascii_uppercase + string.digits, k=5)
    )


def now_utc():
    return datetime.now(timezone.utc)


def demo_distance_km(pickup: str, drop: str) -> float:
    """Deterministic pseudo-distance for demo purposes (12–85 km)."""
    seed = sum(ord(c) for c in (pickup + drop).lower())
    return 12 + (seed * 7) % 74


def add_order_event(db: Session, order: Order, status: str, note: str | None = None) -> None:
    order.status = status
    db.add(OrderStatusEvent(order_id=order.id, status=status, note=note))


def sync_lot_status(db: Session, lot: BulkLot) -> None:
    """Derive bulk-lot status from its orders/deliveries."""
    from sqlalchemy import select

    orders = db.scalars(select(Order).where(Order.lot_id == lot.id)).all()
    if not orders:
        if lot.status == LotStatus.ordered:
            lot.status = LotStatus.ready
        return

    active = [o for o in orders if o.status not in (OrderStatus.cancelled, OrderStatus.completed)]
    if not active:
        lot.status = LotStatus.completed
        return

    # Use the furthest-along active order's delivery state.
    order = active[0]
    delivery = order.delivery
    if delivery is None:
        lot.status = LotStatus.ordered
        return
    mapping = {
        DeliveryStatus.pending: LotStatus.ordered,
        DeliveryStatus.accepted: LotStatus.pickup_assigned,
        DeliveryStatus.at_pickup: LotStatus.pickup_assigned,
        DeliveryStatus.pickup_confirmed: LotStatus.pickup_assigned,
        DeliveryStatus.in_transit: LotStatus.in_transit,
        DeliveryStatus.delivered: LotStatus.delivered,
        DeliveryStatus.completed: LotStatus.completed,
        DeliveryStatus.cancelled: LotStatus.ordered,
    }
    lot.status = mapping.get(delivery.status, lot.status)


def release_lot_quantity(db: Session, lot: BulkLot, qty: float) -> None:
    """Return qty to the source listings proportionally after cancellation."""
    items = lot.lot_items
    total = float(lot.total_quantity_kg) or 1.0
    for item in items:
        share = float(item.allocated_kg) / total
        listing = db.get(ProduceListing, item.listing_id)
        if listing is None:
            continue
        listing.remaining_kg = float(listing.remaining_kg) + round(qty * share, 2)
        if listing.status == ListingStatus.aggregated:
            listing.status = ListingStatus.verified
    lot.remaining_kg = float(lot.remaining_kg) + qty
