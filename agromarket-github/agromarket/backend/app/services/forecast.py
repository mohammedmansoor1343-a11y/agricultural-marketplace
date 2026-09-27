"""Price forecasting module.

For the prototype, forecasts are produced by a transparent, clearly-labelled
statistical heuristic (weighted moving average + bounded trend projection)
applied to historical weekly records. When a trained model and real market
data are available, this module is the single place to plug them in.

Every returned series carries a source note; the UI must never present
forecast values as real market prices.
"""

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PriceRecord

DEMO_CROPS = ["Tomato", "Onion", "Potato", "Chilli"]
SOURCE_NOTE = "Sample data for demonstration only — not real market prices."

_WAVG = [1, 2, 3, 4, 5, 6]  # recent weeks weighted higher


def _series_for(db: Session, crop: str) -> list[PriceRecord]:
    return db.scalars(
        select(PriceRecord)
        .where(PriceRecord.crop_name == crop, PriceRecord.is_forecast.is_(False))
        .order_by(PriceRecord.week_start)
    ).all()


def forecast_next_weeks(db: Session, crop: str, weeks: int = 4) -> list[PriceRecord]:
    history = _series_for(db, crop)
    if not history:
        return []

    prices = [float(p.modal_price_per_kg) for p in history[-len(_WAVG) * 2 :]]
    w = _WAVG[-min(len(prices), len(_WAVG)) :]
    window = prices[-len(w) :]
    weighted = sum(p * x for p, x in zip(window, w)) / sum(w)

    # Bounded trend: percentage change between the two halves of the window.
    half = max(1, len(prices) // 2)
    older = sum(prices[:half]) / half
    newer = sum(prices[-half:]) / half
    weekly_trend = (newer - older) / max(older, 1e-9)
    weekly_trend = max(-0.08, min(0.08, weekly_trend))  # clamp to ±8%/week

    records = []
    last_date = datetime.strptime(history[-1].week_start, "%Y-%m-%d")
    base = weighted
    for i in range(1, weeks + 1):
        base = base * (1 + weekly_trend)
        jitter = random.uniform(-0.02, 0.02)
        value = round(max(base * (1 + jitter), 1.0), 2)
        week = (last_date + timedelta(days=7 * i)).strftime("%Y-%m-%d")
        records.append(
            PriceRecord(
                crop_name=crop,
                week_start=week,
                modal_price_per_kg=value,
                is_forecast=True,
                source=f"Model estimate (weighted trend) — {SOURCE_NOTE}",
            )
        )
    return records


def refresh_forecasts(db: Session, crops: list[str] | None = None) -> None:
    """Recompute and persist 4-week forecasts for the given crops."""
    crops = crops or DEMO_CROPS
    for crop in crops:
        old = db.scalars(select(PriceRecord).where(PriceRecord.crop_name == crop, PriceRecord.is_forecast.is_(True))).all()
        for r in old:
            db.delete(r)
        for r in forecast_next_weeks(db, crop):
            db.add(r)
    db.commit()


def price_series(db: Session, crop: str) -> dict:
    history = _series_for(db, crop)
    forecast = db.scalars(
        select(PriceRecord)
        .where(PriceRecord.crop_name == crop, PriceRecord.is_forecast.is_(True))
        .order_by(PriceRecord.week_start)
    ).all()
    if not forecast and history:
        # Generate estimates on demand (not persisted) so the UI always has a
        # clearly-labelled forecast band; a scheduled job can persist them later.
        forecast = forecast_next_weeks(db, crop)

    current = float(history[-1].modal_price_per_kg) if history else None
    prev = float(history[-2].modal_price_per_kg) if len(history) > 1 else None

    if current is None or prev in (None, 0):
        trend, direction = None, None
    else:
        trend = round((current - prev) / prev * 100, 1)
        direction = "up" if trend > 0.5 else "down" if trend < -0.5 else "flat"

    return {
        "crop_name": crop,
        "history": history,
        "forecast": forecast,
        "current_price": current,
        "trend_percent": trend,
        "trend_direction": direction,
        "source_note": SOURCE_NOTE,
    }


def crop_summaries(db: Session) -> list[dict]:
    out = []
    for crop in DEMO_CROPS:
        s = price_series(db, crop)
        fc = float(s["forecast"][0].modal_price_per_kg) if s["forecast"] else (s["current_price"] or 0)
        out.append(
            {
                "crop_name": crop,
                "current_price": s["current_price"] or 0,
                "forecast_price": fc,
                "trend_percent": s["trend_percent"] or 0,
                "trend_direction": s["trend_direction"] or "flat",
            }
        )
    return out
