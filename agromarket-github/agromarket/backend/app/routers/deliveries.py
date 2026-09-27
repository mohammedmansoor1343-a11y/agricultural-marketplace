from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required, any_authenticated, driver_required
from app.database import get_db
from app.models import Delivery, DeliveryStatus, Driver, Order, OrderStatus, User, Vehicle
from app.schemas.schemas import DeliveryOut, PickupConfirm
from app.services import lifecycle
from app.services.trust import recompute_for_user

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


def serialize_delivery(db: Session, d: Delivery) -> DeliveryOut:
    driver_name = None
    vehicle_type = vehicle_reg = None
    if d.driver:
        driver_name = d.driver.user.full_name
        if d.vehicle:
            vehicle_type = d.vehicle.vehicle_type
            vehicle_reg = d.vehicle.registration_number
    order = d.order
    return DeliveryOut(
        id=d.id,
        delivery_code=d.delivery_code,
        order_id=d.order_id,
        order_code=order.order_code if order else None,
        driver_id=d.driver_id,
        driver_name=driver_name,
        vehicle_type=vehicle_type,
        vehicle_registration_number=vehicle_reg,
        pickup_location=d.pickup_location,
        drop_location=d.drop_location,
        crop_name=d.crop_name,
        load_kg=float(d.load_kg),
        actual_weight_kg=float(d.actual_weight_kg) if d.actual_weight_kg is not None else None,
        distance_km=float(d.distance_km),
        estimated_earnings=float(d.estimated_earnings),
        actual_earnings=float(d.actual_earnings) if d.actual_earnings is not None else None,
        required_capacity_kg=float(d.required_capacity_kg),
        status=d.status,
        buyer_name=order.buyer.user.full_name if order and order.buyer else None,
        created_at=d.created_at,
    )


def _get_delivery(db: Session, delivery_id: int) -> Delivery:
    d = db.get(Delivery, delivery_id)
    if d is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery not found.")
    return d


@router.get("/available", response_model=list[DeliveryOut])
def available_deliveries(current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    jobs = db.scalars(
        select(Delivery)
        .where(Delivery.status == DeliveryStatus.pending, Delivery.driver_id.is_(None))
        .order_by(Delivery.created_at.desc())
    ).all()
    return [serialize_delivery(db, d) for d in jobs]


@router.get("/mine", response_model=list[DeliveryOut])
def my_deliveries(current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    driver = current_user.driver_profile
    jobs = db.scalars(
        select(Delivery)
        .where(Delivery.driver_id == driver.id)
        .order_by(Delivery.created_at.desc())
    ).all()
    return [serialize_delivery(db, d) for d in jobs]


@router.get("/for-buyer", response_model=list[DeliveryOut])
def buyer_deliveries(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    """Deliveries for all orders of the logged-in buyer."""
    if current_user.buyer_profile is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Buyer profile required.")
    jobs = db.scalars(
        select(Delivery)
        .join(Delivery.order)
        .where(Delivery.order.has(buyer_id=current_user.buyer_profile.id))
        .order_by(Delivery.created_at.desc())
    ).all()
    return [serialize_delivery(db, d) for d in jobs]


@router.get("/all", response_model=list[DeliveryOut])
def all_deliveries(current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    jobs = db.scalars(select(Delivery).order_by(Delivery.created_at.desc())).all()
    return [serialize_delivery(db, d) for d in jobs]


@router.post("/{delivery_id}/accept", response_model=DeliveryOut)
def accept_delivery(
    delivery_id: int,
    vehicle_id: int,
    current_user: User = Depends(driver_required),
    db: Session = Depends(get_db),
):
    d = _get_delivery(db, delivery_id)
    if d.status != DeliveryStatus.pending or d.driver_id is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This job has already been taken.")

    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.driver_id != current_user.driver_profile.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Select one of your own vehicles.")
    if float(vehicle.capacity_kg) < float(d.required_capacity_kg):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Your vehicle capacity ({float(vehicle.capacity_kg):g} kg) is below the required {float(d.required_capacity_kg):g} kg.",
        )

    d.driver_id = current_user.driver_profile.id
    d.vehicle_id = vehicle.id
    d.status = DeliveryStatus.accepted
    current_user.driver_profile.is_available = False
    d.assigned_at = datetime.now(timezone.utc)
    lifecycle.add_order_event(
        db, d.order, OrderStatus.driver_assigned,
        f"Driver {current_user.full_name} assigned ({vehicle.vehicle_type})",
    )
    lifecycle.sync_lot_status(db, d.order.lot)
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


@router.post("/{delivery_id}/arrive-pickup", response_model=DeliveryOut)
def arrive_pickup(delivery_id: int, current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    d = _get_delivery(db, delivery_id)
    _ensure_driver(d, current_user)
    if d.status != DeliveryStatus.accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Delivery must be in 'accepted' state.")
    d.status = DeliveryStatus.at_pickup
    lifecycle.add_order_event(db, d.order, OrderStatus.pickup_scheduled, "Driver arrived at pickup point")
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


@router.post("/{delivery_id}/confirm-pickup", response_model=DeliveryOut)
def confirm_pickup(
    delivery_id: int,
    payload: PickupConfirm,
    current_user: User = Depends(driver_required),
    db: Session = Depends(get_db),
):
    d = _get_delivery(db, delivery_id)
    _ensure_driver(d, current_user)
    if d.status not in (DeliveryStatus.at_pickup, DeliveryStatus.accepted):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Confirm arrival before pickup.")

    d.actual_weight_kg = payload.actual_weight_kg
    d.status = DeliveryStatus.pickup_confirmed
    d.actual_earnings = round(float(d.estimated_earnings) * min(payload.actual_weight_kg / max(float(d.load_kg), 1), 1.15), 2)
    lifecycle.add_order_event(
        db, d.order, OrderStatus.picked_up,
        f"Pickup confirmed with verified weight {payload.actual_weight_kg:g} kg",
    )
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


@router.post("/{delivery_id}/start-transit", response_model=DeliveryOut)
def start_transit(delivery_id: int, current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    d = _get_delivery(db, delivery_id)
    _ensure_driver(d, current_user)
    if d.status != DeliveryStatus.pickup_confirmed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pickup must be confirmed first.")
    d.status = DeliveryStatus.in_transit
    lifecycle.add_order_event(db, d.order, OrderStatus.in_transit, "Produce is in transit")
    lifecycle.sync_lot_status(db, d.order.lot)
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


@router.post("/{delivery_id}/confirm-delivery", response_model=DeliveryOut)
def confirm_delivery(delivery_id: int, current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    d = _get_delivery(db, delivery_id)
    _ensure_driver(d, current_user)
    if d.status != DeliveryStatus.in_transit:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Delivery must be in transit.")
    d.status = DeliveryStatus.delivered
    lifecycle.add_order_event(db, d.order, OrderStatus.delivered, "Delivered to buyer location")
    lifecycle.sync_lot_status(db, d.order.lot)
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


@router.post("/{delivery_id}/complete", response_model=DeliveryOut)
def complete_delivery(delivery_id: int, current_user: User = Depends(driver_required), db: Session = Depends(get_db)):
    d = _get_delivery(db, delivery_id)
    _ensure_driver(d, current_user)
    if d.status != DeliveryStatus.delivered:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Delivery must be delivered before completion.")

    d.status = DeliveryStatus.completed
    d.completed_at = datetime.now(timezone.utc)
    if d.driver:
        d.driver.is_available = True
    lifecycle.add_order_event(db, d.order, OrderStatus.completed, "Delivery completed; order fulfilled")
    lifecycle.sync_lot_status(db, d.order.lot)
    recompute_for_user(db, current_user.id, reason="delivery completed")
    db.commit()
    db.refresh(d)
    return serialize_delivery(db, d)


def _ensure_driver(d: Delivery, current_user: User):
    if d.driver_id != current_user.driver_profile.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This delivery is not assigned to you.")
