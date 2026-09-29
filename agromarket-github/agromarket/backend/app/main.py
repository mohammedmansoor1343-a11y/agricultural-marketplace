from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.routers import aggregation, auth, deliveries, lots, matching, meta, orders, payments, prices, produce, users

DESCRIPTION = """
Prototype API for the AgroMarket agricultural marketplace.

- Role-based auth (farmer, buyer, driver, coordinator, admin)
- Produce listings & physical verification
- Rule-based bulk aggregation with contribution tracking
- Marketplace of bulk lots with transparent price breakdown
- Orders, driver matching, delivery workflow, simulated payments
- Price forecasting (clearly labelled sample data) & trust scores
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from seed.seed_data import seed_if_empty

        seed_if_empty()
    except ImportError:
        import sys
        from pathlib import Path

        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from seed.seed_data import seed_if_empty

        seed_if_empty()
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.VERSION, description=DESCRIPTION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",s
        "http://127.0.0.1:5173",
        "https://farmer-buyer-marketplace-chi.vercel.app",
        "https://farmer-buyer-marketplace-git-main-aletheia-s.vercel.app",
        "https://farmer-buyer-marketplace-4z3kz7c3-aletheia-s.vercel.app",
        "https://farmer-buyer-marketplace-ckq0feu-aletheia-s.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth.router,
    produce.router,
    aggregation.router,
    lots.router,
    orders.router,
    deliveries.router,
    payments.router,
    matching.router,
    users.router,
    prices.router,
    meta.router,
):
    app.include_router(r, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.VERSION, "demo_mode": settings.DEMO_MODE}
@app.get("/")
def home():
    return {
        "message": "Welcome to AgroMarket API",
        "status": "running",
        "docs": "/docs"
    }