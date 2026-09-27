# AgroMarket — Farm to Buyer Marketplace

A full-stack prototype of a direct agricultural marketplace connecting **farmers, buyers,
transportation providers, and village coordinators**. Farmers list produce, small quantities
are combined into bulk lots, verified buyers order online, and registered drivers handle
delivery — with a transparent price ledger on every transaction.

> ⚠️ **Demonstration prototype.** Payments are simulated and price forecasts use clearly
> labelled sample data. Not intended for real financial transactions.

## Features

| Area | What it does |
|---|---|
| 5 role-based dashboards | Farmer, Buyer, Driver, Village Coordinator, Admin |
| Produce listings | Coordinators verify listings physically before they can be sold |
| AI-based aggregation | Verified listings are grouped by crop + location into bulk lots (configurable 200 kg threshold) |
| Marketplace | Buyers browse bulk lots with crop, quantity, price, farmer count, pickup location |
| Orders & delivery | Full order lifecycle, driver matching, accept → pickup → transit → delivered workflow |
| Payments | Simulated payment records with a transparent breakdown: Farmer Price + Transport + Platform Fee = Buyer Price |
| Price trends | Historical weekly charts and clearly-labelled forecast estimates |
| Trust scores | Transaction-based scoring for users |
| Admin | User management, monitoring, reports, platform settings |

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, Recharts, React Router
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2, JWT auth (python-jose + passlib/bcrypt)
- **Database:** PostgreSQL (SQLite fallback for quick demos)

## Project Structure

```
agromarket/
├── backend/
│   ├── app/
│   │   ├── core/          # config, security (JWT, password hashing)
│   │   ├── models/        # SQLAlchemy models (users, listings, lots, orders…)
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── routers/       # REST endpoints per module
│   │   ├── services/      # aggregation, forecasting, driver matching, payments, trust
│   │   ├── database.py
│   │   └── main.py
│   ├── seed/seed_data.py  # realistic demo data (auto-seeds on first run)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/           # typed API client
    │   ├── components/    # shared UI components (incl. glass loading overlay)
    │   ├── context/       # auth + app state
    │   ├── layouts/       # dashboard shell with sidebar
    │   └── pages/         # landing, auth, farmer, buyer, driver, coordinator, admin
    └── package.json
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally (**or** use the SQLite demo fallback below)

### 1. Backend

```bash
cd backend

# Option A — PostgreSQL (default)
#   create a database named `agromarket`, then set:
#   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agromarket"

# Option B — zero-setup SQLite demo
export DATABASE_URL="sqlite:///./agromarket.db"

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API starts at **http://localhost:8000** — interactive docs at `/docs`.
On first start the database is created and seeded with demo data automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Demo Accounts

Every seeded account uses the password **`Demo@123`**.

| Role | Email |
|---|---|
| Admin | `admin@agromarket.in` |
| Farmer | `ramesh@agromarket.in` |
| Buyer | `vikram@agromarket.in` |
| Driver | `imran@agromarket.in` |
| Coordinator | `coordinator@agromarket.in` |

Demo data includes 8 farmers across 3 villages, 3 buyers, 4 drivers with vehicles of
different capacities, verified produce listings (Tomato, Onion, Potato, Chilli), bulk lots
in every lifecycle state, orders, deliveries, and simulated payments.

## Environment Variables (backend)

All optional — sensible defaults are built in. Copy `.env.example` to `.env` to override.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/agromarket` | Database connection string |
| `SECRET_KEY` | prototype default | JWT signing key — **change for any real deployment** |
| `AGGREGATION_THRESHOLD_KG` | `200` | Minimum kg to form a bulk lot (also admin-configurable at runtime) |
| `PLATFORM_FEE_PER_KG` | `2` | Platform fee in ₹/kg |
| `DEMO_MODE` | `true` | Labels simulated payments/forecasts as demo data |

Frontend: set `VITE_API_URL` at build time to point at the backend (defaults to
`http://localhost:8000`).

## Production Build

```bash
cd frontend && npm run build     # outputs static files to frontend/dist
cd backend && uvicorn app.main:app --port 8000
```

Serve `frontend/dist` with any static host (or `npm run preview` for a local check) and
point `VITE_API_URL` at your deployed backend URL when building.

## Notes for Reviewers

- **Payments** are simulated end-to-end and labelled as demo — no real money moves.
- **Price forecasts** are generated from clearly-labelled sample data, not a trained model.
- **Driver matching** uses transparent rule-based scoring (capacity → proximity → route),
  not a claimed AI optimizer.
- Payment-provider or real market-data integrations would plug into
  `app/services/payments.py` and `app/services/forecast.py` respectively.
