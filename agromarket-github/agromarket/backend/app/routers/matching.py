from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required, buyer_required
from app.database import get_db
from app.models import Delivery, DeliveryStatus, Driver, Order, OrderStatus, User
from app.schemas.schemas import AssignDriverRequest, DeliveryOut, DriverMatchOut
from app.routers.deliveries import serialize_delivery
from app.services import lifecycle
from app.services.matching import find_matching_drivers

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/drivers/{order_id}", response_model=DriverMatchOut)
def match_drivers(order_id: int, current_user: User = Depends(buyer_required), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    if order.buyer_id != current_user.buyer_profile.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order.")
    if order.status not in (OrderStatus.confirmed, OrderStatus.pending):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Driver matching is available while the order is awaiting a driver.",
        )
    return find_matching_drivers(db, order)


@router.post("/drivers/{order_id}/assign", response_model=DeliveryOut)
def assign(order_id: int, payload: AssignDriverRequest, current_user: User = Depends(buyer_required), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    if order.buyer_id != current_user.buyer_profile.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order.")

    delivery = db.scalars(select(Delivery).where(Delivery.order_id == order.id)).first()
    if delivery is None or delivery.status != DeliveryStatus.pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Delivery is not awaiting assignment.")
    driver = db.get(Driver, payload.driver_id)
    if driver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found.")

    delivery.driver_id = driver.id
    delivery.vehicle_id = payload.vehicle_id
    delivery.status = DeliveryStatus.accepted
    driver.is_available = False
    from datetime import datetime, timezone

    delivery.assigned_at = datetime.now(timezone.utc)
    lifecycle.add_order_event(
        db, order, OrderStatus.driver_assigned,
        f"Driver {driver.user.full_name} assigned",
    )
    lifecycle.sync_lot_status(db, order.lot)
    db.commit()
    db.refresh(delivery)
    return serialize_delivery(db, delivery)
