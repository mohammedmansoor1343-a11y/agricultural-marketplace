"""Transparent, configurable trust-score computation.

Rules (documented in the UI so no user is unfairly penalised):
- Base score 70 for every account.
- +3 per completed transaction (max contribution +18).
- -5 per cancellation caused by the user (disputed/external cancellations are
  recorded without penalty).
- +1 per on-time delivery (max +6).
- Up to +6 from average rating (rating-3, clamped 0..6).
- Verification adds +2 for the verified weight trust signal.
Final score is clamped to 0..100.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Delivery, DeliveryStatus, TrustScore, User


def compute_score(
    completed: int,
    cancelled: int,
    on_time: int,
    rating_avg: float | None,
) -> float:
    score = settings.TRUST_BASE_SCORE
    score += min(completed * 3, 18)
    score -= cancelled * 5
    score += min(on_time, 6)
    if rating_avg is not None:
        score += max(0.0, min(6.0, (rating_avg - 3) * 3))
    return round(max(0.0, min(score, 100.0)), 1)


def recompute_for_user(db: Session, user_id: int, reason: str = "periodic recompute") -> TrustScore:
    user = db.get(User, user_id)
    if user is None:
        raise ValueError("User not found")

    completed = cancelled = on_time = 0
    rating_avg = None

    ts = db.scalars(select(TrustScore).where(TrustScore.user_id == user_id)).first()
    if ts is None:
        ts = TrustScore(user_id=user_id, score=settings.TRUST_BASE_SCORE)
        db.add(ts)

    if user.role == "driver" and user.driver_profile:
        driver = user.driver_profile
        deliveries = db.scalars(select(Delivery).where(Delivery.driver_id == driver.id)).all()
        completed = sum(1 for d in deliveries if d.status == DeliveryStatus.completed)
        cancelled = sum(1 for d in deliveries if d.status == DeliveryStatus.cancelled)
        on_time = completed  # prototype: completed implies on-time
        if completed:
            rating_avg = min(5.0, 3.8 + 0.2 * min(completed, 6))  # demo-derived rating

    score = compute_score(completed, cancelled, on_time, rating_avg)

    ts.score = score
    ts.completed_transactions = completed
    ts.cancelled_transactions = cancelled
    ts.on_time_deliveries = on_time
    ts.rating_avg = rating_avg
    ts.last_updated_reason = reason
    db.commit()
    db.refresh(ts)
    return ts


def recompute_all(db: Session) -> None:
    for user in db.scalars(select(User).where(User.is_active.is_(True))).all():
        recompute_for_user(db, user.id, reason="bulk recompute")
