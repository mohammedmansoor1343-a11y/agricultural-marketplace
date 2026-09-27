from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import (
    AccountStatus,
    Buyer,
    Coordinator,
    Driver,
    Farmer,
    User,
    UserRole,
    Vehicle,
)
from app.schemas.schemas import (
    BuyerRegister,
    CoordinatorRegister,
    DriverRegister,
    FarmerRegister,
    LoginRequest,
    TokenResponse,
    UserAdminOut,
    UserOut,
)
from app.routers.users import build_user_admin_out
from app.services.trust import recompute_for_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _bcrypt_safe(password: str) -> str:
    """bcrypt operates on at most 72 bytes; normalise before hashing."""
    return password[:72]


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(
    payload: FarmerRegister | BuyerRegister | DriverRegister | CoordinatorRegister,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    if db.scalars(select(User).where(User.phone == payload.phone)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this phone number already exists.")

    user = User(
        full_name=payload.full_name,
        email=email,
        phone=payload.phone,
        hashed_password=hash_password(_bcrypt_safe(payload.password)),
        role=payload.role,
        status=AccountStatus.pending,
        is_active=True,
    )
    db.add(user)
    db.flush()

    if isinstance(payload, FarmerRegister):
        db.add(Farmer(user_id=user.id, village=payload.village, district=payload.district))
    elif isinstance(payload, BuyerRegister):
        db.add(
            Buyer(
                user_id=user.id,
                business_name=payload.business_name,
                business_type=payload.business_type,
                business_address=payload.business_address,
                gst_number=payload.gst_number,
            )
        )
    elif isinstance(payload, DriverRegister):
        driver = Driver(
            user_id=user.id,
            license_number=payload.driving_license_number,
            service_area=payload.service_area,
            is_available=True,
        )
        db.add(driver)
        db.flush()
        db.add(
            Vehicle(
                driver_id=driver.id,
                vehicle_type=payload.vehicle_type,
                registration_number=payload.vehicle_registration_number,
                capacity_kg=payload.vehicle_capacity_kg,
            )
        )
    elif isinstance(payload, CoordinatorRegister):
        db.add(Coordinator(user_id=user.id, village=payload.village, district=payload.district))

    recompute_for_user(db, user.id, reason="account created")
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ident = payload.identifier.strip().lower()
    user = db.scalars(
        select(User).where((User.email == ident) | (User.phone == payload.identifier.strip()))
    ).first()
    if not user or not verify_password(_bcrypt_safe(payload.password), user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials. Please try again.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is suspended. Contact support.")

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/detail", response_model=UserAdminOut)
def me_detail(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_admin_out(db, current_user)
