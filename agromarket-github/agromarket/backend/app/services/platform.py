"""Central platform parameters with DB-backed overrides (admin-configurable)."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import PlatformSetting

KEY_THRESHOLD = "aggregation_threshold_kg"
KEY_PLATFORM_FEE = "platform_fee_per_kg"


def get_setting(db: Session, key: str, default: str | None = None) -> str | None:
    row = db.get(PlatformSetting, key)
    return row.value if row else default


def set_setting(db: Session, key: str, value: str, description: str = "") -> PlatformSetting:
    row = db.get(PlatformSetting, key)
    if row:
        row.value = value
        if description:
            row.description = description
    else:
        row = PlatformSetting(key=key, value=value, description=description)
        db.add(row)
    return row


def get_aggregation_threshold(db: Session) -> float:
    v = get_setting(db, KEY_THRESHOLD)
    try:
        return float(v) if v is not None else settings.AGGREGATION_THRESHOLD_KG
    except (TypeError, ValueError):
        return settings.AGGREGATION_THRESHOLD_KG


def get_platform_fee_per_kg(db: Session) -> float:
    v = get_setting(db, KEY_PLATFORM_FEE)
    try:
        return float(v) if v is not None else settings.PLATFORM_FEE_PER_KG
    except (TypeError, ValueError):
        return settings.PLATFORM_FEE_PER_KG
