from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    admin_required,
    coordinator_required,
    farmer_required,
    get_current_user,
    hash_password,
    require_roles,
)
from app.database import get_db
from app.models import (
    AccountStatus,
    Farmer,
    ListingStatus,
    ProduceListing,
    TrustScore,
    User,
    UserRole,
)
from app.schemas.schemas import (
    CoordinatorFarmerOut,
    FarmerRegisterQuick,
    MessageResponse,
    ProduceCreate,
    ProduceOut,
    VerifyProduceRequest,
)
from app.services.trust import recompute_for_user

router = APIRouter(prefix="/produce", tags=["produce"])


@router.post("", response_model=ProduceOut, status_code=201)
def create_produce(
    payload: ProduceCreate,
    current_user: User = Depends(farmer_required),
    db: Session = Depends(get_db),
):
    farmer = current_user.farmer_profile
    if farmer is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Farmer profile not found.")
    listing = ProduceListing(
        farmer_id=farmer.id,
        crop_name=payload.crop_name.strip().title(),
        quantity_kg=payload.quantity_kg,
        remaining_kg=payload.quantity_kg,
        expected_price_per_kg=payload.expected_price_per_kg,
        village=payload.village.strip(),
        pickup_location=payload.pickup_location.strip(),
        available_from=payload.available_from,
        image_url=payload.image_url,
        status=ListingStatus.pending,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.get("/mine", response_model=list[ProduceOut])
def my_produce(current_user: User = Depends(farmer_required), db: Session = Depends(get_db)):
    farmer = current_user.farmer_profile
    listings = db.scalars(
        select(ProduceListing)
        .where(ProduceListing.farmer_id == farmer.id)
        .order_by(ProduceListing.created_at.desc())
    ).all()
    return listings


@router.get("/pending", response_model=list[ProduceOut])
def pending_produce(current_user: User = Depends(coordinator_required), db: Session = Depends(get_db)):
    return db.scalars(
        select(ProduceListing)
        .where(ProduceListing.status == ListingStatus.pending)
        .order_by(ProduceListing.created_at.asc())
    ).all()


@router.get("/history", response_model=list[ProduceOut])
def verification_history(current_user: User = Depends(coordinator_required), db: Session = Depends(get_db)):
    return db.scalars(
        select(ProduceListing)
        .where(
            ProduceListing.verified_by_coordinator_id == current_user.coordinator_profile.id,
            ProduceListing.status.in_([ListingStatus.verified, ListingStatus.rejected, ListingStatus.aggregated]),
        )
        .order_by(ProduceListing.verified_at.desc())
    ).all()


@router.post("/{listing_id}/verify", response_model=ProduceOut)
def verify_produce(
    listing_id: int,
    payload: VerifyProduceRequest,
    current_user: User = Depends(coordinator_required),
    db: Session = Depends(get_db),
):
    listing = db.get(ProduceListing, listing_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found.")
    if listing.status != ListingStatus.pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only pending listings can be reviewed.")

    if payload.action == "reject":
        listing.status = ListingStatus.rejected
        listing.rejection_reason = payload.rejection_reason or "Did not meet verification requirements."
    else:
        verified = min(payload.verified_weight_kg, float(listing.quantity_kg) * 1.2)
        listing.status = ListingStatus.verified
        listing.verified_weight_kg = verified
        listing.remaining_kg = verified
        listing.verification_photo_url = payload.verification_photo_url
        listing.verified_at = datetime.now(timezone.utc)
        listing.verified_by_coordinator_id = current_user.coordinator_profile.id
        if current_user.coordinator_profile not in ():
            pass

    db.commit()
    db.refresh(listing)
    return listing


@router.get("/all", response_model=list[ProduceOut])
def all_produce(current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    return db.scalars(select(ProduceListing).order_by(ProduceListing.created_at.desc())).all()


# --------------------------------------------------------------------------- #
# Coordinator: farmer directory & assisted registration
# --------------------------------------------------------------------------- #


@router.get("/coordinator/farmers", response_model=list[CoordinatorFarmerOut])
def coordinator_farmers(current_user: User = Depends(coordinator_required), db: Session = Depends(get_db)):
    farmers = db.scalars(select(Farmer).order_by(Farmer.created_at.desc())).all()
    out = []
    for f in farmers:
        user = f.user
        out.append(
            CoordinatorFarmerOut(
                farmer_id=f.id,
                user_id=user.id,
                full_name=user.full_name,
                phone=user.phone,
                village=f.village,
                district=f.district,
                status=user.status,
                listing_count=len(f.listings),
            )
        )
    return out


@router.post("/coordinator/farmers", response_model=CoordinatorFarmerOut, status_code=201)
def coordinator_register_farmer(
    payload: FarmerRegisterQuick,
    current_user: User = Depends(coordinator_required),
    db: Session = Depends(get_db),
):
    if db.scalars(select(User).where(User.phone == payload.phone)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this phone number already exists.")

    import secrets

    temp_password = secrets.token_urlsafe(8)
    user = User(
        full_name=payload.full_name,
        email=f"farmer{secrets.token_hex(4)}@agromarket.demo",
        phone=payload.phone,
        hashed_password=hash_password(temp_password),
        role=UserRole.farmer,
        status=AccountStatus.verified,
        is_active=True,
    )
    db.add(user)
    db.flush()
    farmer = Farmer(user_id=user.id, village=payload.village, district=payload.district)
    db.add(farmer)
    recompute_for_user(db, user.id, reason="registered by coordinator")
    db.commit()

    return CoordinatorFarmerOut(
        farmer_id=farmer.id,
        user_id=user.id,
        full_name=user.full_name,
        phone=user.phone,
        village=farmer.village,
        district=farmer.district,
        status=user.status,
        listing_count=0,
    )


@router.get("/coordinator/summary")
def coordinator_summary(current_user: User = Depends(coordinator_required), db: Session = Depends(get_db)):
    total_farmers = len(db.scalars(select(Farmer)).all())
    pending = len(db.scalars(select(ProduceListing).where(ProduceListing.status == ListingStatus.pending)).all())
    verified = len(
        db.scalars(
            select(ProduceListing).where(
                ProduceListing.status.in_([ListingStatus.verified, ListingStatus.aggregated])
            )
        ).all()
    )
    from sqlalchemy import func

    total_kg = db.scalar(func.coalesce(func.sum(ProduceListing.verified_weight_kg), 0.0))
    return {
        "cards": [
            {"label": "Total Registered Farmers", "value": total_farmers, "tone": "green"},
            {"label": "Pending Verifications", "value": pending, "tone": "amber"},
            {"label": "Verified Listings", "value": verified, "tone": "green"},
            {"label": "Total Produce Collected", "value": f"{round(float(total_kg))} kg", "tone": "blue"},
        ],
        "extra": {},
    }
