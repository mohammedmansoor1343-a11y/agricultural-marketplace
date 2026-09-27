from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required
from app.database import get_db
from app.models import AccountStatus, Driver, Farmer, TrustScore, User, UserRole, Vehicle
from app.schemas.schemas import MessageResponse, UserAdminAction, UserAdminOut


def build_user_admin_out(db: Session, user: User) -> UserAdminOut:
    village = district = business_name = business_type = vehicle_summary = None
    if user.farmer_profile:
        village, district = user.farmer_profile.village, user.farmer_profile.district
    if user.coordinator_profile:
        village, district = user.coordinator_profile.village, user.coordinator_profile.district
    if user.buyer_profile:
        business_name = user.buyer_profile.business_name
        business_type = user.buyer_profile.business_type
    if user.driver_profile:
        vehicles = user.driver_profile.vehicles
        if vehicles:
            v = vehicles[0]
            vehicle_summary = f"{v.vehicle_type} · {v.registration_number} · {float(v.capacity_kg):g} kg"
    ts = db.scalars(select(TrustScore).where(TrustScore.user_id == user.id)).first()
    return UserAdminOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        status=user.status,
        is_active=user.is_active,
        village=village,
        district=district,
        business_name=business_name,
        business_type=business_type,
        vehicle_summary=vehicle_summary,
        trust_score=float(ts.score) if ts else None,
        created_at=user.created_at,
    )


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserAdminOut])
def list_users(role: str | None = None, search: str | None = None, current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    q = select(User).order_by(User.created_at.desc())
    if role:
        q = q.where(User.role == role)
    if search:
        like = f"%{search.lower()}%"
        q = q.where(
            (User.full_name.ilike(like)) | (User.email.ilike(like)) | (User.phone.ilike(like))
        )
    users = db.scalars(q).all()
    return [build_user_admin_out(db, u) for u in users]


@router.get("/{user_id}", response_model=UserAdminOut)
def get_user(user_id: int, current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return build_user_admin_out(db, user)


@router.post("/{user_id}/action", response_model=UserAdminOut)
def user_action(
    user_id: int,
    payload: UserAdminAction,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    if payload.action == "verify":
        user.status = AccountStatus.verified
        user.is_active = True
    elif payload.action == "suspend":
        user.status = AccountStatus.suspended
        user.is_active = False
    elif payload.action == "activate":
        user.status = AccountStatus.verified
        user.is_active = True

    db.commit()
    db.refresh(user)
    return build_user_admin_out(db, user)
