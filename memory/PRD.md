# ShipLink — Multi-City Warehouse & Shop Marketplace

## Problem statement (verbatim)

A unified marketplace + operations platform for multiple cities & warehouses:
- Multi-city warehouse architecture (Kolkata, Siliguri, Durgapur, Malda with 1–2 warehouses each)
- Orders auto-routed to the nearest warehouse using OpenStreetMap geo abstraction
- Six roles: super_admin, warehouse_manager, shop_owner, customer, delivery_partner, collection_partner
- Existing Zomato-style Shop App integrated via shared DB + `/api/sync/*` endpoints (SSO, shared products/inventory/orders)
- Auth: JWT (email/password) + Emergent-managed Google OAuth
- Razorpay payments (MOCKED for MVP)

## Architecture

- **Backend**: FastAPI (Python) + MongoDB (motor async). All routes prefixed with `/api`.
  - `server.py` main app; `models.py` Pydantic; `db.py` connection + indexes + seed
  - `auth.py` JWT (bcrypt) + Emergent Google OAuth session flow
  - `geo.py` `LocationProvider` abstraction (`OSMLocationProvider` for MVP) — swap in Google Maps later without touching business logic
  - Routers: `admin`, `warehouse`, `marketplace`, `shop` (+ `sync_router`), `partner` (delivery + collection), `payment`

- **Frontend**: React + Tailwind + shadcn/ui + Leaflet + Phosphor icons
  - AuthContext + CartContext + role-based routing (`ProtectedRoute`)
  - Three layouts: `DashboardLayout` (admin / warehouse / shop), `PublicLayout` (customer), `PartnerLayout` (mobile-style)
  - MapView wraps Leaflet + CARTO Positron tiles on OpenStreetMap

## User personas

| Role | Access |
|---|---|
| Super Admin | Everything: cities, warehouses, shops, users, orders, KYC, coupons, ads, live map |
| Warehouse Manager | Only orders/staff/inventory of their assigned warehouse |
| Shop Owner | Own shop: products, inventory, incoming orders |
| Customer | Marketplace: browse by city, cart, checkout, my orders, ratings |
| Delivery Partner | Mobile: active deliveries, mark delivered, history, earnings |
| Collection Partner | Mobile: pickup tasks from shops, drop at warehouse |

## Implemented (Feb 2026)

- Multi-city seed: 4 cities, 6 warehouses, 20 shops, ~48 products
- Nearest-warehouse assignment via haversine within service radius
- Full order lifecycle: placed → accepted → collected → at_warehouse → packed → out_for_delivery → delivered
- RBAC guardrails on every router
- JWT auth with 24h access + 7d refresh cookies (httpOnly, secure, samesite=none) + brute-force lockout keyed by email (5 attempts / 15 min)
- Emergent Google OAuth (`/api/auth/google/session`) — same user record
- Razorpay mock payment flow
- Shop-app sync endpoints: `/api/sync/health`, pull orders, push products, push inventory, order status updates
- Live map with warehouses, shops, partners, active orders
- Coupons (WELCOME10, SHIP50 seeded) with min-order + max-discount cap
- KYC approve/reject
- Rating & review after delivery, feeds back into shop rating

## Test credentials

See `/app/memory/test_credentials.md`

## Backend test status

**iteration_1**: 36/37 passed (97%). Brute-force lockout bug (used K8s proxy IP that hopped between pods) — FIXED by keying lockout on email instead. Verified via curl (401×5 → 429).

## Deferred (next tasks)

**P0** — polish
- Decrement product stock on order placement + prevent oversell
- Validate coupon `expires_at`
- Enforce state-machine transitions in warehouse endpoints (packed before out_for_delivery)

**P1** — features
- Real-time updates via WebSocket (currently polling on refresh)
- Notifications drawer (per role)
- Wallet balance for customers and partners
- Advertisement carousel in marketplace hero
- Nearest-warehouse override rules per city (weight capacity vs distance)
- Partner earnings withdrawal + commission ledger for admin
- Shop rating breakdown, review moderation
- CSV export for orders/warehouses/reports

**P2** — production
- Replace mock Razorpay with real integration + signature verification
- Gate `/api/sync/*` behind shared secret / API key
- CI/CD, structured logging, Sentry
- Multi-language (English + Bengali)
- Google Maps provider (`geo.py` already has abstraction)
