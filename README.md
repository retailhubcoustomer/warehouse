# ShipLink — Multi-City Warehouse Marketplace

Zomato-style local marketplace + logistics/ops platform with **6 roles**
(super admin, warehouse manager, shop owner, customer, delivery partner,
collection partner). All data is stored in **MongoDB** — no localStorage-only
persistence.

- 🏙️ Multi-city warehouse routing (Kolkata · Siliguri · Durgapur · Malda)
- 🗺️ OpenStreetMap + Leaflet nearest-warehouse assignment
- 🛒 Persistent cart, watchlist, notifications & preferences
- 🚚 Transport & 🛠️ Helper listings with Call/WhatsApp + ❤ save
- 🔐 JWT (email/password) **and** Emergent-managed Google OAuth
- 🧾 Razorpay payments (mocked in dev — swap keys to go live)
- 📦 Full order lifecycle with real-time-feel notifications
- 📊 Admin, warehouse and shop-owner dashboards

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python 3.11+) |
| Database | MongoDB 6+ (via `motor` async driver) |
| Frontend | React 18 + React Router 6 + Tailwind + shadcn/ui |
| Maps | Leaflet + OpenStreetMap (CARTO Positron tiles) |
| Icons | Phosphor Icons |
| Auth | bcrypt + JWT + Emergent Google OAuth |

---

## Quick start (local, no Docker)

### 1. Prerequisites

- Python 3.11+
- Node 18+ and **yarn** (do not use npm — the frontend was built with yarn)
- MongoDB running locally (default: `mongodb://localhost:27017`)

### 2. Backend

```bash
cd backend
cp .env.example .env               # then edit values below
pip install -r requirements.txt
python seed.py                     # seed cities/warehouses/shops/etc.
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

`.env` values you likely want to change:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=shiplink
JWT_SECRET=<generate with: python -c "import secrets;print(secrets.token_hex(32))">
ADMIN_EMAIL=admin@shiplink.com
ADMIN_PASSWORD=Admin@123
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env               # point REACT_APP_BACKEND_URL at your API
yarn install
yarn start
```

Open http://localhost:3000. Log in with the seeded super admin
(`admin@shiplink.com` / `Admin@123`) — full list of demo accounts is in
`memory/test_credentials.md`.

---

## Environment variables

### `backend/.env`

| Key | Required | Purpose |
|---|---|---|
| `MONGO_URL` | ✅ | Mongo connection string (any provider) |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET` | ✅ | HMAC secret for access/refresh tokens |
| `ADMIN_EMAIL` | ✅ | Bootstrapped super-admin email |
| `ADMIN_PASSWORD` | ✅ | Bootstrapped super-admin password |
| `CORS_ORIGINS` | — | Comma list, default `*` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | — | Real keys enable live payments (mock otherwise) |
| `EMERGENT_AUTH_BASE` | — | Override the Emergent Google OAuth endpoint |
| `FRONTEND_URL` | — | Used to build OAuth redirects |

### `frontend/.env`

| Key | Required | Purpose |
|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ | Base URL of the API (no trailing `/`) — all calls go to `${URL}/api/*` |

---

## Database setup

### Local MongoDB

```bash
# macOS (Homebrew)
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo apt install mongodb && sudo systemctl enable --now mongod

# Docker
docker run -d --name mongo -p 27017:27017 mongo:7
```

### MongoDB Atlas (recommended for production)

1. Create a free cluster at https://cloud.mongodb.com
2. Whitelist your IP and create a database user
3. Copy the connection string and set `MONGO_URL` in `backend/.env`
4. Run `python seed.py` — Atlas will auto-create the DB & collections

---

## Seed data

`python seed.py` is idempotent. Re-run any time — it only inserts records
into empty collections.

To reset demo content (keeps user accounts):

```bash
python seed.py --wipe
```

The seed creates:
- 4 cities, 6 warehouses (with managers), 20 shops, ~80 products
- 8 delivery partners, 8 collection partners (2 per city)
- 1 shop-owner demo account
- 2 coupon codes (`WELCOME10`, `SHIP50`)
- 28 transport providers (7 types × 4 cities)
- 36 helpers (9 professions × 4 cities)

All credentials are written to `memory/test_credentials.md`.

---

## Collection map (MongoDB)

| Collection | Purpose |
|---|---|
| `users` | All accounts (all roles). Unique index on `email` + `user_id` |
| `user_sessions` | Google OAuth session tokens |
| `user_preferences` | City, notification, language prefs (unique per user) |
| `password_reset_tokens` | TTL-indexed |
| `login_attempts` | Brute-force lockout counters |
| `cities`, `warehouses` | Geography |
| `shops`, `products` | Marketplace catalog |
| `orders` | Full order lifecycle with `timeline` array |
| `carts` | **Persistent cart per user** (unique per `user_id`) |
| `watchlist` | Saved shops / products / transport / helpers |
| `notifications` | Per-user notification feed |
| `transport_providers`, `helper_providers` | Local services listings |
| `coupons`, `ads` | Promotions |

All ID fields are string UUIDs prefixed by type (`usr_`, `shop_`, `ord_`, …)
so nothing depends on Mongo's `ObjectId` in the response payloads.

---

## API surface (all `/api/*`)

- `POST /api/auth/register` / `login` / `logout` / `refresh` / `google/session`
- `GET  /api/auth/me`
- `PATCH /api/user/profile`, `POST /api/user/password`
- `GET/PATCH /api/user/preferences`
- `GET/PUT/DELETE /api/cart`
- `GET /api/notifications`, `POST /api/notifications/read`, `/unread-count`
- `GET/POST /api/marketplace/watchlist/toggle`, `GET /api/marketplace/watchlist/ids`
- `GET /api/marketplace/{cities,shops,products,transport,helpers}`
- `POST /api/marketplace/orders`, `GET /api/marketplace/orders/:id`
- `POST /api/marketplace/orders/:id/rate`
- `GET /api/admin/*` (super_admin only)
- `GET /api/warehouse/*` (warehouse_manager only)
- `GET /api/shop/*`, `PATCH /api/shop/status`, `/settings`
- `GET/POST /api/delivery/*` and `/api/collection/*`
- `POST /api/payments/create-order`, `/verify` (Razorpay mocked)
- `POST /api/sync/*` (webhooks for external Shop App integration)

---

## Deployment

The backend is a plain ASGI app — deploy to any host that speaks Python
(Fly.io, Render, Railway, Vercel Functions, k8s). The frontend is a static
React build. `sudo supervisorctl` is used in the dev container but any
process manager works (systemd, PM2, Docker Compose).

Build for production:

```bash
# backend
uvicorn server:app --host 0.0.0.0 --port 8001

# frontend
cd frontend && yarn build     # → static files in build/
```

---

## Testing

Backend end-to-end tests live in `test_reports/`. Run the built-in test
agent from the platform (`testing_agent_v3`) or write your own using the
demo credentials in `memory/test_credentials.md`.

---

## License

MIT
