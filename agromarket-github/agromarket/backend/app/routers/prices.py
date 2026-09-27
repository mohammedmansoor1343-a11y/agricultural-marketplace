from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import any_authenticated
from app.database import get_db
from app.models import User
from app.schemas.schemas import CropSummary, PriceSeriesOut
from app.services.forecast import DEMO_CROPS, crop_summaries, price_series

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/crops", response_model=list[CropSummary])
def crops(current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    return crop_summaries(db)


@router.get("/{crop_name}", response_model=PriceSeriesOut)
def crop_series(crop_name: str, current_user: User = Depends(any_authenticated), db: Session = Depends(get_db)):
    series = price_series(db, crop_name.title())
    return PriceSeriesOut(
        crop_name=series["crop_name"],
        history=series["history"],
        forecast=series["forecast"],
        current_price=series["current_price"],
        trend_percent=series["trend_percent"],
        trend_direction=series["trend_direction"],
        source_note=series["source_note"],
    )
