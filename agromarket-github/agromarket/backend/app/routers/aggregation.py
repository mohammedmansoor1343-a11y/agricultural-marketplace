from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import admin_required, any_authenticated
from app.database import get_db
from app.models import BulkLot, LotStatus, User, UserRole
from app.schemas.schemas import AggregationPreviewOut, AggregationRunOut, BulkLotOut, MessageResponse
from app.services.aggregation import preview_aggregation, run_aggregation
from app.services.platform import (
    KEY_THRESHOLD,
    get_aggregation_threshold,
    set_setting,
)

router = APIRouter(prefix="/aggregation", tags=["aggregation"])


@router.get("/preview", response_model=AggregationPreviewOut)
def preview(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    return preview_aggregation(db)


@router.post("/run", response_model=AggregationRunOut)
def run(current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    result = run_aggregation(db)
    created = []
    for lot in result["created"]:
        created.append(_lot_out(db, lot))
    return {"lots_created": created, "groups_below_threshold": result["below"]}


@router.get("/threshold")
def get_threshold(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    return {"threshold_kg": get_aggregation_threshold(db)}


@router.put("/threshold", response_model=MessageResponse)
def update_threshold(payload: dict, current_user: User = Depends(admin_required), db: Session = Depends(get_db)):
    try:
        value = float(payload.get("threshold_kg"))
        if value <= 0:
            raise ValueError
    except (TypeError, ValueError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Threshold must be a positive number.")
    set_setting(db, KEY_THRESHOLD, str(value), "Minimum kg per crop/location group to create a bulk lot")
    db.commit()
    return MessageResponse(message=f"Aggregation threshold updated to {value:g} kg.")


def _lot_out(db: Session, lot: BulkLot) -> BulkLotOut:
    from app.routers.lots import serialize_lot

    return serialize_lot(db, lot)
