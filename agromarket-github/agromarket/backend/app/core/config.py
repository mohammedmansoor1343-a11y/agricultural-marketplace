from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings. Override via environment variables or a .env file."""
    APP_NAME: str = "AgroMarket API"
    VERSION: str = "1.0.0"

    # --- Database -----------------------------------------------------------
    # Default to a local PostgreSQL instance. For a quick demo without a
    # PostgreSQL server, set DATABASE_URL to a sqlite URL, e.g.
    #   DATABASE_URL=sqlite:///./agromarket.db
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/agromarket"

    # --- Security -----------------------------------------------------------
    SECRET_KEY: str = "agromarket-prototype-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # --- Business defaults ---------------------------------------------------
    AGGREGATION_THRESHOLD_KG: float = 200.0          # admin-configurable
    PLATFORM_FEE_PER_KG: float = 2.0                 # admin-configurable
    TRANSPORT_RATE_PER_KM_PER_KG: float = 0.15       # demo transport pricing
    BASE_TRANSPORT_FEE: float = 150.0                # demo base trip fee
    TRUST_BASE_SCORE: float = 70.0

    # --- Demo flags ----------------------------------------------------------
    DEMO_MODE: bool = True   # simulated payments / sample forecasts are labelled

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
