from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required, any_authenticated, buyer_required, farmer_required
from app.database import get_db
from app.models import (
    BulkLot,
    Delivery,
    DeliveryStatus,
    LotStatus,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    User,
)
from app.schemas.schemas import (
    DeliveryOut,
    OrderCreate,
    OrderDetailOut,
    OrderOut,
    OrderStatusEventOut,
    PaymentOut,
)
from app.services import lifecycle
from app.services.payments import build_payment_for_order

router = APIRouter(prefix="/orders", tags=["orders"])


def serialize_order(db: Session, order: Order) -> OrderOut:
    delivery = order.delivery
    return OrderOut(
        id=order.id,
        order_code=order.order_code,
        lot_id=order.lot_id,
        quantity_kg=float(order.quantity_kg),
        price_per_kg=float(order.price_per_kg),
        farmer_price_per_kg=float(order.farmer_price_per_kg),
        transport_cost_per_kg=float(order.transport_cost_per_kg),
        platform_fee_per_kg=float(order.platform_fee_per_kg),
        total_amount=float(order.total_amount),
        status=order.status,
        created_at=order.created_at,
        lot_crop_name=order.lot.crop_name,
        lot_pickup_location=order.lot.pickup_location,
        buyer_name=order.buyer.user.full_name if order.buyer else None,
        buyer_business=order.buyer.business_name if order.buyer else None,
        delivery_code=delivery.delivery_code if delivery else None,
        delivery_status=delivery.status if delivery else None,
    )


def serialize_payment(db: Session, payment: Payment) -> PaymentOut:
    order = payment.order
    return PaymentOut(
        id=payment.id,
        order_id=payment.order_id,
        amount=float(payment.amount),
        farmer_amount=float(payment.farmer_amount),
        transport_amount=float(payment.transport_amount),
        platform_fee_amount=float(payment.platform_fee_amount),
        status=payment.status,
        transaction_ref=payment.transaction_ref,
        is_simulated=payment.is_simulated,
        created_at=payment.created_at,
        order_code=order.order_code,
        buyer_name=order.buyer.user.full_name if order.buyer else None,
        crop_name=order.lot.crop_name,
        quantity_kg=float(order.quantity_kg),
    )


def _require_active_lot(lot: BulkLot):
    if lot.status in (LotStatus.cancelled,):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This bulk lot has been cancelled.")


@router.post("", response_model=OrderOut, status_code=201)
def place_order(
    payload: OrderCreate,
    current_user: User = Depends(buyer_required),
    db: Session = Depends(get_db),
):
    lot = db.get(BulkLot, payload.lot_id)
    if lot is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bulk lot not found.")
    _require_active_lot(lot)
    if lot.status not in (LotStatus.ready, LotStatus.collecting):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"This lot is currently '{lot.status.replace('_', ' ')}' and cannot accept new orders.",
        )
    if payload.quantity_kg > float(lot.remaining_kg):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Only {float(lot.remaining_kg):g} kg remain in this lot. Reduce your order quantity.",
        )

    order = Order(
        order_code=lifecycle.new_code("ORD"),
        buyer_id=current_user.buyer_profile.id,
        lot_id=lot.id,
        quantity_kg=payload.quantity_kg,
        price_per_kg=float(lot.price_per_kg) + float(lot.transport_cost_per_kg) + float(lot.platform_fee_per_kg),
        farmer_price_per_kg=float(lot.price_per_kg),
        transport_cost_per_kg=float(lot.transport_cost_per_kg),
        platform_fee_per_kg=float(lot.platform_fee_per_kg),
        total_amount=round(payload.quantity_kg * (float(lot.price_per_kg) + float(lot.transport_cost_per_kg) + float(lot.platform_fee_per_kg)), 2),
        status=OrderStatus.pending,
    )
    db.add(order)
    db.flush()

    # Reserve quantity and create the delivery shell awaiting a driver match.
    lot.remaining_kg = float(lot.remaining_kg) - payload.quantity_kg
    if lot.status == LotStatus.ready and lot.remaining_kg <= 0.01:
        lot.status = LotStatus.ordered
    db.add(
        Delivery(
            delivery_code=lifecycle.new_code("DLV"),
            order_id=order.id,
            pickup_location=lot.pickup_location,
            drop_location=current_user.buyer_profile.business_address,
            crop_name=lot.crop_name,
            load_kg=payload.quantity_kg,
            required_capacity_kg=payload.quantity_kg,
            distance_km=lifecycle.demo_distance_km(lot.pickup_location, current_user.buyer_profile.business_address),
            estimated_earnings=round(200 + 0.9 * payload.quantity_kg + 2.5 * lifecycle.demo_distance_km(lot.pickup_location, current_user.buyer_profile.business_address), 2),
            status=DeliveryStatus.pending,
        )
    )
    lifecycle.add_order_event(db, order, OrderStatus.pending, "Order placed; awaiting confirmation")
    build_payment_for_order(db, order)
    db.commit()
    db.refresh(order)
    return serialize_order(db, order)


@router.get("/mine", response_model=list[OrderOut])
def my_orders(current_user: User = Depends(buyer_required), db: Session = Depends(get_db)):
    orders = db.scalars(
        select(Order)
        .where(Order.buyer_id == current_user.buyer_profile.id)
        .order_by(Order.created_at.desc())
    ).all()
    return [serialize_order(db, o) for o in orders]


@router.get("/for-farmer", response_model=list[OrderOut])
def orders_for_farmer(current_user: User = Depends(farmer_required), db: Session = Depends(get_db)):
    """Orders that include produce from this farmer's listings."""
    from app.models import BulkLotListing

    farmer = current_user.farmer_profile
    lot_ids = set(
        db.scalars(select(BulkLotListing.lot_id).where(BulkLotListing.farmer_id == farmer.id)).all()
    )
    if not lot_ids:
        return []
    orders = db.scalars(
        select(Order).where(Order.lot_id.in_(lot_ids)).order_by(Order.created_at.desc())
    ).all()
    return [serialize_order(db, o) for o in orders]


@router.get("/lot/{lot_id}", response_model=list[OrderOut])
def orders_for_lot(lot_id: int, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    return [serialize_order(db, o) for o in db.scalars(select(Order).where(Order.lot_id == lot_id)).all()]


@router.get("/{order_id}", response_model=OrderDetailOut)
def order_detail(order_id: int, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    base = serialize_order(db, order)
    detail = OrderDetailOut(
        **base.model_dump(),
        status_history=[
            OrderStatusEventOut.model_validate(e) for e in order.status_history
        ],
        items=[],
    )
    return detail


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")

    is_buyer = current_user.buyer_profile and order.buyer_id == current_user.buyer_profile.id
    is_admin = current_user.role == UserRole.admin
    if not (is_buyer or is_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot cancel this order.")

    terminal = (OrderStatus.completed, OrderStatus.cancelled)
    if order.status in terminal:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Order is already {order.status}.")

    lifecycle.add_order_event(db, order, OrderStatus.cancelled, "Order cancelled; reserved quantity returned")
    lifecycle.release_lot_quantity(db, order.lot, float(order.quantity_kg))
    lifecycle.sync_lot_status(db, order.lot)

    payment = db.scalars(select(Payment).where(Payment.order_id == order.id)).first()
    if payment and payment.status == PaymentStatus.paid:
        payment.status = PaymentStatus.refunded

    delivery = order.delivery
    if delivery and delivery.driver_id:
        delivery.driver.is_available = True
    if delivery and delivery.status not in (DeliveryStatus.completed,):
        delivery.status = DeliveryStatus.cancelled

    db.commit()
    db.refresh(order)
    return serialize_order(db, order)
