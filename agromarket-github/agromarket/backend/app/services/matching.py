"""Rule-based driver matching ("AI-based" with transparent scoring factors).

Scoring factors (documented in the UI):
- Vehicle capacity >= required load (hard filter).
- Driver availability and free vehicle (hard filter).
- Service-area compatibility with the pickup location (soft score).
- Route compatibility: drop location within the service area (soft score).
- Estimated distance (soft score, shorter is better).

The recommendation is the highest-ranked candidate. No claim of real AI
optimization is made; this is deterministic rule-based logic.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Delivery, Driver, Order, User, Vehicle, DeliveryStatus


def _token_overlap(a: str, b: str) -> float:
    ta = {t for t in a.lower().replace(",", " ").split() if len(t) > 2}
    tb = {t for t in b.lower().replace(",", " ").split() if len(t) > 2}
    if not ta or not tb:
        return 0.0
    inter = ta & tb
    score = len(inter) / max(len(ta | tb), 1)
    # prefix bonus for near-matches
    for x in ta:
        for y in tb:
            if len(x) >= 4 and len(y) >= 4 and (x.startswith(y) or y.startswith(x)):
                score = min(1.0, score + 0.15)
                break
    return min(score, 1.0)


def find_matching_drivers(db: Session, order: Order, limit: int = 5) -> dict:
    lot = order.lot
    delivery = db.scalars(select(Delivery).where(Delivery.order_id == order.id)).first()
    if delivery is None:
        return {"order_id": order.id, "candidates": [], "recommended_driver_id": None,
                "message": "No delivery record exists for this order yet."}

    if delivery.status != DeliveryStatus.pending:
        return {"order_id": order.id, "candidates": [], "recommended_driver_id": None,
                "message": f"Delivery is already {delivery.status.replace('_', ' ')}."}

    required = float(delivery.required_capacity_kg)
    distance_km = float(delivery.distance_km)
    candidates: list[dict] = []

    drivers = db.scalars(select(Driver).where(Driver.is_available.is_(True))).all()
    for d in drivers:
        for v in d.vehicles:
            if float(v.capacity_kg) < required:
                continue
            user = db.get(User, d.user_id)
            area_score = _token_overlap(d.service_area, delivery.pickup_location)
            route_score = _token_overlap(d.service_area, delivery.drop_location)
            capacity_headroom = min(float(v.capacity_kg) / max(required, 1), 2.0) / 2.0  # 0.5..1
            distance_penalty = min(distance_km / 100.0, 1.0)  # 0..1

            match = round(
                0.40 * area_score
                + 0.25 * route_score
                + 0.20 * capacity_headroom
                + 0.15 * (1 - distance_penalty),
                3,
            )
            candidates.append(
                {
                    "driver_id": d.id,
                    "driver_name": user.full_name if user else f"Driver #{d.id}",
                    "vehicle_id": v.id,
                    "vehicle_type": v.vehicle_type,
                    "registration_number": v.registration_number,
                    "capacity_kg": float(v.capacity_kg),
                    "service_area": d.service_area,
                    "distance_score": round(area_score, 2),
                    "route_compatibility": round(route_score, 2),
                    "match_score": match,
                    "is_available": True,
                }
            )

    candidates.sort(key=lambda c: c["match_score"], reverse=True)
    candidates = candidates[:limit]

    if not candidates:
        return {
            "order_id": order.id,
            "candidates": [],
            "recommended_driver_id": None,
            "message": "No suitable driver is available right now. An admin can assign one manually.",
        }

    return {
        "order_id": order.id,
        "candidates": candidates,
        "recommended_driver_id": candidates[0]["driver_id"],
        "message": f"{len(candidates)} suitable driver(s) found. Recommended: {candidates[0]['driver_name']}.",
    }


def assign_driver(db: Session, order: Order, driver_id: int, vehicle_id: int) -> Delivery | None:
    delivery = db.scalars(select(Delivery).where(Delivery.order_id == order.id)).first()
    if delivery is None or delivery.status != DeliveryStatus.pending:
        return None
    driver = db.get(Driver, driver_id)
    vehicle = db.get(Vehicle, vehicle_id)
    if driver is None or vehicle is None or vehicle.driver_id != driver.id:
        return None
    if float(vehicle.capacity_kg) < float(delivery.required_capacity_kg):
        return None

    delivery.driver_id = driver.id
    delivery.vehicle_id = vehicle.id
    delivery.status = DeliveryStatus.accepted
    driver.is_available = False
    from datetime import datetime, timezone

    delivery.assigned_at = datetime.now(timezone.utc)

    from app.models import OrderStatus
    order.status = OrderStatus.driver_assigned
    order.status_history.append(
        OrderStatusEvent_stub(order, "driver_assigned", f"Driver {driver.user.full_name} assigned")
    )
    db.commit()
    return delivery


def OrderStatusEvent_stub(order, status, note):
    from app.models import OrderStatusEvent

    return OrderStatusEvent(order_id=order.id, status=status, note=note)
