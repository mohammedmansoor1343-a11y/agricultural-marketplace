"""Payment and transaction-transparency helpers.

The prototype uses a clearly-labelled simulated payment workflow (no real
money moves; every simulated record is flagged is_simulated=True). When a
real provider is integrated, replace the _simulate_* calls with provider
API calls while keeping the same breakdown semantics.
"""

import random
import string

from sqlalchemy.orm import Session

from app.models import Order, Payment, PaymentStatus


def _ref(prefix: str) -> str:
    return f"{prefix}-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def build_payment_for_order(db: Session, order: Order) -> Payment:
    qty = float(order.quantity_kg)
    payment = Payment(
        order_id=order.id,
        amount=round(float(order.total_amount), 2),
        farmer_amount=round(qty * float(order.farmer_price_per_kg), 2),
        transport_amount=round(qty * float(order.transport_cost_per_kg), 2),
        platform_fee_amount=round(qty * float(order.platform_fee_per_kg), 2),
        status=PaymentStatus.pending,
        is_simulated=True,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def simulate_payment_transition(db: Session, payment: Payment, action: str) -> Payment:
    """Move a simulated payment through its lifecycle and generate a reference."""
    transitions = {
        "process": PaymentStatus.processing,
        "pay": PaymentStatus.paid,
        "fail": PaymentStatus.failed,
        "refund": PaymentStatus.refunded,
    }
    target = transitions.get(action)
    if target is None:
        raise ValueError(f"Unknown payment action: {action}")

    payment.status = target
    if target == PaymentStatus.processing:
        payment.transaction_ref = payment.transaction_ref or _ref("TXN")
    elif target == PaymentStatus.paid:
        payment.transaction_ref = payment.transaction_ref or _ref("TXN")
    elif target == PaymentStatus.refunded:
        payment.transaction_ref = payment.transaction_ref or _ref("RFD")
    db.commit()
    db.refresh(payment)
    return payment
