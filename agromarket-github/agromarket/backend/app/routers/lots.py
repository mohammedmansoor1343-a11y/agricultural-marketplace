from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import any_authenticated
from app.database import get_db
from app.models import BulkLot, BulkLotListing, Farmer, User
from app.schemas.schemas import BulkLotOut, LotItemOut

router = APIRouter(prefix="/lots", tags=["lots"])


def serialize_lot(db: Session, lot: BulkLot) -> BulkLotOut:
    items = []
    for item in lot.lot_items:
        farmer = db.get(Farmer, item.farmer_id)
        user = db.get(User, farmer.user_id) if farmer else None
        items.append(
            LotItemOut(
                id=item.id,
                listing_id=item.listing_id,
                farmer_id=item.farmer_id,
                allocated_kg=float(item.allocated_kg),
                price_per_kg=float(item.price_per_kg),
                farmer_name=user.full_name if user else None,
                village=farmer.village if farmer else None,
            )
        )
    return BulkLotOut(
        id=lot.id,
        lot_code=lot.lot_code,
        crop_name=lot.crop_name,
        total_quantity_kg=float(lot.total_quantity_kg),
        remaining_kg=float(lot.remaining_kg),
        farmer_count=lot.farmer_count,
        pickup_location=lot.pickup_location,
        available_from=lot.available_from,
        price_per_kg=float(lot.price_per_kg),
        transport_cost_per_kg=float(lot.transport_cost_per_kg),
        platform_fee_per_kg=float(lot.platform_fee_per_kg),
        buyer_price_per_kg=round(
            float(lot.price_per_kg) + float(lot.transport_cost_per_kg) + float(lot.platform_fee_per_kg), 2
        ),
        status=lot.status,
        created_at=lot.created_at,
        items=items,
    )


@router.get("", response_model=list[BulkLotOut])
def list_lots(status: str | None = None, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    q = select(BulkLot).order_by(BulkLot.created_at.desc())
    if status:
        q = q.where(BulkLot.status == status)
    lots = db.scalars(q).all()
    return [serialize_lot(db, lot) for lot in lots]


@router.get("/{lot_id}", response_model=BulkLotOut)
def get_lot(lot_id: int, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    lot = db.get(BulkLot, lot_id)
    if lot is None:
        from fastapi import HTTPException, status as http_status

        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Bulk lot not found.")
    return serialize_lot(db, lot)
