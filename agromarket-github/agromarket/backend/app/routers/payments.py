from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required, any_authenticated, buyer_required
from app.database import get_db
from app.models import Payment, PaymentStatus, User, UserRole
from app.schemas.schemas import PaymentOut
from app.routers.orders import serialize_payment
from app.services.payments import simulate_payment_transition

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/mine", response_model=list[PaymentOut])
def my_payments(current_user: User = Depends(buyer_required), db: Session = Depends(get_db)):
    payments = db.scalars(
        select(Payment)
        .join(Payment.order)
        .where(Payment.order.has(buyer_id=current_user.buyer_profile.id))
        .order_by(Payment.created_at.desc())
    ).all()
    return [serialize_payment(db, p) for p in payments]


@router.get("/farmer/mine", response_model=list[PaymentOut])
def farmer_payments(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    from app.models import BulkLotListing, Farmer, Order

    farmer = current_user.farmer_profile
    if farmer is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Farmer profile required.")

    listing_ids = [l.id for l in farmer.listings]
    if not listing_ids:
        return []
    lot_ids = set(db.scalars(select(BulkLotListing.lot_id).where(BulkLotListing.listing_id.in_(listing_ids))).all())
    if not lot_ids:
        return []
    orders = db.scalars(select(Order).where(Order.lot_id.in_(lot_ids))).all()
    payments = db.scalars(select(Payment).where(Payment.order_id.in_([o.id for o in orders]))).all()
    return [serialize_payment(db, p) for p in payments]


@router.get("/all", response_model=list[PaymentOut])
def all_payments(current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    payments = db.scalars(select(Payment).order_by(Payment.created_at.desc())).all()
    return [serialize_payment(db, p) for p in payments]


@router.get("/driver/earnings", response_model=list[PaymentOut])
def driver_earnings(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    """Delivery earnings for the logged-in driver (derived from deliveries)."""
    from app.models import Delivery, DeliveryStatus

    driver = current_user.driver_profile
    if driver is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Driver profile required.")
    deliveries = db.scalars(select(Delivery).where(Delivery.driver_id == driver.id)).all()

    out = []
    for d in deliveries:
        if d.status not in (DeliveryStatus.completed, DeliveryStatus.delivered):
            continue
        out.append(
            {
                "order_id": d.order_id,
                "order_code": d.order.order_code,
                "amount": float(d.actual_earnings or d.estimated_earnings),
                "farmer_amount": 0,
                "transport_amount": float(d.actual_earnings or d.estimated_earnings),
                "platform_fee_amount": 0,
                "status": "paid" if d.status == DeliveryStatus.completed else "processing",
                "transaction_ref": f"DLV-{d.delivery_code}",
                "is_simulated": True,
                "created_at": d.completed_at or d.created_at,
                "crop_name": d.crop_name,
                "quantity_kg": float(d.actual_weight_kg or d.load_kg),
            }
        )
    return out


@router.post("/{payment_id}/action", response_model=PaymentOut)
def payment_action(
    payment_id: int,
    payload: dict,
    current_user: User = Depends(any_authenticated),
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment record not found.")

    action = payload.get("action")
    allowed_buyer = current_user.buyer_profile and payment.order.buyer_id == current_user.buyer_profile.id
    is_admin = current_user.role == UserRole.admin

    if action in ("pay", "process") and not (allowed_buyer or is_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the buyer or an admin can process this payment.")
    if action in ("refund", "fail") and not is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an admin can refund or fail a payment.")

    try:
        payment = simulate_payment_transition(db, payment, action)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return serialize_payment(db, payment)
