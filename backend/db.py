"""MongoDB connection, index setup and seed data."""
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

from models import gen_id, now_utc
from auth import hash_password
from geo import location_provider

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


async def ensure_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("role")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.cities.create_index("city_id", unique=True)
    await db.warehouses.create_index("warehouse_id", unique=True)
    await db.warehouses.create_index("city_id")
    await db.shops.create_index("shop_id", unique=True)
    await db.shops.create_index("city_id")
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("shop_id")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("customer_id")
    await db.orders.create_index("shop_id")
    await db.orders.create_index("warehouse_id")
    await db.orders.create_index("status")
    await db.coupons.create_index("code", unique=True)
    await db.transport_providers.create_index("provider_id", unique=True)
    await db.transport_providers.create_index("city_id")
    await db.helper_providers.create_index("helper_id", unique=True)
    await db.helper_providers.create_index("city_id")
    await db.watchlist.create_index([("user_id", 1), ("entity_type", 1), ("entity_id", 1)],
                                      unique=True)
    await db.watchlist.create_index("user_id")
    # cart / notifications / user_preferences
    await db.carts.create_index("user_id", unique=True)
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.user_preferences.create_index("user_id", unique=True)


# ------------------ seed helpers ------------------
CITY_SEED = [
    {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
    {"name": "Siliguri", "lat": 26.7271, "lng": 88.3953},
    {"name": "Durgapur", "lat": 23.5204, "lng": 87.3119},
    {"name": "Malda", "lat": 25.0119, "lng": 88.1433},
]

WAREHOUSE_SEED = {
    "Kolkata": [
        {"name": "Kolkata Warehouse A", "code": "KOL-A", "lat": 22.5850, "lng": 88.3600, "capacity": 5000},
        {"name": "Kolkata Warehouse B", "code": "KOL-B", "lat": 22.5450, "lng": 88.4000, "capacity": 4000},
    ],
    "Siliguri": [
        {"name": "Siliguri Warehouse A", "code": "SIL-A", "lat": 26.7300, "lng": 88.4000, "capacity": 3000},
    ],
    "Durgapur": [
        {"name": "Durgapur Warehouse A", "code": "DGP-A", "lat": 23.5200, "lng": 87.3200, "capacity": 3000},
    ],
    "Malda": [
        {"name": "Malda Warehouse A", "code": "MLD-A", "lat": 25.0100, "lng": 88.1400, "capacity": 2500},
        {"name": "Malda Warehouse B", "code": "MLD-B", "lat": 25.0250, "lng": 88.1600, "capacity": 2000},
    ],
}

SHOP_TEMPLATE = [
    ("Green Basket Grocery", "grocery", "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"),
    ("Sharma Electronics", "electronics", "https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=800"),
    ("Style Bazaar Fashion", "fashion", "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800"),
    ("City Pharmacy", "pharmacy", "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800"),
    ("Bengal Sweets", "food", "https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=800"),
]

PRODUCT_TEMPLATE = {
    "grocery": [
        ("Basmati Rice 5kg", 550, "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"),
        ("Toor Dal 1kg", 180, "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400"),
        ("Sunflower Oil 1L", 165, "https://images.unsplash.com/photo-1615485500704-8e990f9900f1?w=400"),
        ("Aashirvaad Atta 5kg", 320, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"),
    ],
    "electronics": [
        ("Wireless Earbuds", 1999, "https://images.unsplash.com/photo-1778257911549-d83c1698bde9?w=400"),
        ("Bluetooth Speaker", 2499, "https://images.unsplash.com/photo-1511389290465-d11bafd4c1df?w=400"),
        ("Smart Watch", 3299, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"),
    ],
    "fashion": [
        ("Cotton T-Shirt", 599, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"),
        ("Denim Jeans", 1299, "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400"),
        ("Kurti Set", 899, "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400"),
    ],
    "pharmacy": [
        ("Paracetamol Strip", 30, "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400"),
        ("Vitamin C Tablets", 180, "https://images.unsplash.com/photo-1550572017-edd951b55104?w=400"),
    ],
    "food": [
        ("Rosogolla Box", 250, "https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=400"),
        ("Sandesh Pack", 200, "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400"),
    ],
}


async def seed_admin() -> None:
    email = os.environ["ADMIN_EMAIL"].lower()
    pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "user_id": gen_id("usr"),
            "email": email,
            "password_hash": hash_password(pw),
            "name": "Super Admin",
            "role": "super_admin",
            "kyc_status": "approved",
            "is_active": True,
            "created_at": now_utc().isoformat(),
        })
    else:
        # keep password in sync with .env for reliable admin login
        from auth import verify_password
        if not verify_password(pw, existing["password_hash"]):
            await db.users.update_one({"email": email},
                                      {"$set": {"password_hash": hash_password(pw)}})


async def seed_geography() -> None:
    if await db.cities.count_documents({}) > 0:
        return
    city_id_by_name = {}
    for c in CITY_SEED:
        cid = gen_id("city")
        city_id_by_name[c["name"]] = cid
        await db.cities.insert_one({
            "city_id": cid, "name": c["name"], "state": "West Bengal",
            "lat": c["lat"], "lng": c["lng"], "is_active": True,
            "created_at": now_utc().isoformat(),
        })
    for city_name, whs in WAREHOUSE_SEED.items():
        cid = city_id_by_name[city_name]
        for w in whs:
            await db.warehouses.insert_one({
                "warehouse_id": gen_id("wh"),
                "name": w["name"], "code": w["code"], "city_id": cid,
                "address": f"{w['name']}, {city_name}",
                "lat": w["lat"], "lng": w["lng"], "capacity": w["capacity"],
                "manager_id": None, "is_active": True,
                "service_radius_km": 40.0,
                "created_at": now_utc().isoformat(),
            })


async def seed_shops_and_products() -> None:
    if await db.shops.count_documents({}) > 0:
        return
    cities = await db.cities.find({}, {"_id": 0}).to_list(100)
    warehouses = await db.warehouses.find({}, {"_id": 0}).to_list(100)
    for c in cities:
        for i, (name, cat, img) in enumerate(SHOP_TEMPLATE):
            # small jitter around city centre
            jitter_lat = c["lat"] + (i - 2) * 0.01
            jitter_lng = c["lng"] + (i - 2) * 0.012
            wh = location_provider.nearest(jitter_lat, jitter_lng,
                                            [w for w in warehouses if w["city_id"] == c["city_id"]])
            shop_id = gen_id("shop")
            await db.shops.insert_one({
                "shop_id": shop_id,
                "name": f"{name} · {c['name']}",
                "owner_id": None,
                "city_id": c["city_id"],
                "address": f"Main Road, {c['name']}",
                "lat": jitter_lat, "lng": jitter_lng,
                "category": cat, "image_url": img,
                "business_hours": "9:00 AM - 10:00 PM",
                "rating": 4.0 + (i % 5) * 0.15,
                "reviews_count": 20 + i * 7,
                "is_active": True,
                "warehouse_id": wh["warehouse_id"] if wh else None,
                "created_at": now_utc().isoformat(),
            })
            for pname, price, pimg in PRODUCT_TEMPLATE.get(cat, []):
                await db.products.insert_one({
                    "product_id": gen_id("prd"),
                    "shop_id": shop_id,
                    "name": pname, "description": f"Fresh {pname} from {name}",
                    "price": price, "stock": 100,
                    "category": cat, "image_url": pimg,
                    "is_active": True,
                    "created_at": now_utc().isoformat(),
                })


async def seed_partner_accounts() -> None:
    if await db.users.count_documents({"role": {"$in": ["warehouse_manager", "delivery_partner",
                                                            "collection_partner", "shop_owner"]}}) > 0:
        return
    warehouses = await db.warehouses.find({}, {"_id": 0}).to_list(100)
    # one warehouse manager per warehouse
    for i, w in enumerate(warehouses):
        uid = gen_id("usr")
        email = f"wh{i+1}@shiplink.com"
        await db.users.insert_one({
            "user_id": uid, "email": email,
            "password_hash": hash_password("Warehouse@123"),
            "name": f"{w['name']} Manager", "role": "warehouse_manager",
            "warehouse_id": w["warehouse_id"], "city_id": w["city_id"],
            "kyc_status": "approved", "is_active": True,
            "created_at": now_utc().isoformat(),
        })
        await db.warehouses.update_one({"warehouse_id": w["warehouse_id"]},
                                        {"$set": {"manager_id": uid}})
    # delivery + collection partners (2 each per city)
    cities = await db.cities.find({}, {"_id": 0}).to_list(100)
    for c in cities:
        for i in range(2):
            await db.users.insert_one({
                "user_id": gen_id("usr"),
                "email": f"delivery.{c['name'].lower()}.{i+1}@shiplink.com",
                "password_hash": hash_password("Partner@123"),
                "name": f"Delivery Partner {c['name']} {i+1}",
                "role": "delivery_partner", "city_id": c["city_id"],
                "phone": f"98{1000000 + i}", "kyc_status": "approved", "is_active": True,
                "lat": c["lat"], "lng": c["lng"],
                "created_at": now_utc().isoformat(),
            })
            await db.users.insert_one({
                "user_id": gen_id("usr"),
                "email": f"collection.{c['name'].lower()}.{i+1}@shiplink.com",
                "password_hash": hash_password("Partner@123"),
                "name": f"Collection Partner {c['name']} {i+1}",
                "role": "collection_partner", "city_id": c["city_id"],
                "phone": f"98{2000000 + i}", "kyc_status": "approved", "is_active": True,
                "lat": c["lat"], "lng": c["lng"],
                "created_at": now_utc().isoformat(),
            })
    # shop owner (attach to first shop of first city)
    first_shop = await db.shops.find_one({}, {"_id": 0})
    if first_shop:
        owner_id = gen_id("usr")
        await db.users.insert_one({
            "user_id": owner_id,
            "email": "shop.owner@shiplink.com",
            "password_hash": hash_password("Shop@123"),
            "name": f"{first_shop['name']} Owner",
            "role": "shop_owner", "shop_id": first_shop["shop_id"],
            "city_id": first_shop["city_id"], "kyc_status": "approved", "is_active": True,
            "created_at": now_utc().isoformat(),
        })
        await db.shops.update_one({"shop_id": first_shop["shop_id"]},
                                   {"$set": {"owner_id": owner_id}})


async def seed_coupons() -> None:
    if await db.coupons.count_documents({}) > 0:
        return
    await db.coupons.insert_many([
        {"coupon_id": gen_id("cpn"), "code": "WELCOME10", "discount_percent": 10, "min_order": 200,
         "max_discount": 100, "is_active": True, "created_at": now_utc().isoformat()},
        {"coupon_id": gen_id("cpn"), "code": "SHIP50", "discount_percent": 20, "min_order": 500,
         "max_discount": 200, "is_active": True, "created_at": now_utc().isoformat()},
    ])


TRANSPORT_TEMPLATE = [
    ("Rajesh Kumar", "toto", "Toto EV, seats 4",
     "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80",
     "linear-gradient(135deg,#22c55e,#15803d)"),
    ("Mohammed Anwar", "auto", "CNG Auto Rickshaw",
     "https://images.unsplash.com/photo-1567337712310-cfab6d3c9d5d?w=600&q=80",
     "linear-gradient(135deg,#fbbf24,#d97706)"),
    ("Bikash Ghosh", "bike", "Delivery bike (Splendor)",
     "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&q=80",
     "linear-gradient(135deg,#ef4444,#b91c1c)"),
    ("Suman Das", "car", "Sedan (Dzire)",
     "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80",
     "linear-gradient(135deg,#334155,#0f172a)"),
    ("Rina Devi", "van", "Cargo van (Bolero)",
     "https://images.unsplash.com/photo-1618434392039-5b6dd8ca1ed6?w=600&q=80",
     "linear-gradient(135deg,#f97316,#c2410c)"),
    ("Ashok Yadav", "pickup", "Tata Ace pickup",
     "https://images.unsplash.com/photo-1601924357840-6c0dabf3f10f?w=600&q=80",
     "linear-gradient(135deg,#8b5cf6,#5b21b6)"),
    ("Sunil Prasad", "mini_truck", "Mahindra Mini Truck",
     "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80",
     "linear-gradient(135deg,#0ea5e9,#0369a1)"),
]

HELPER_TEMPLATE = [
    ("Anil Sharma", "plumber", 8, "Complete pipe fitting, leak fixing, geyser install",
     "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&q=80", 250,
     "linear-gradient(135deg,#0ea5e9,#0369a1)"),
    ("Deepak Verma", "electrician", 12, "House wiring, ceiling fan, MCB & inverter repair",
     "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80", 300,
     "linear-gradient(135deg,#f59e0b,#d97706)"),
    ("Rakesh Mistry", "carpenter", 15, "Kathmistri — furniture, door frames, cupboards",
     "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80", 400,
     "linear-gradient(135deg,#b45309,#78350f)"),
    ("Nazir Ali", "mason", 20, "Brick work, plaster, tile fitting",
     "https://images.unsplash.com/photo-1581092919535-fdad0f47b6f8?w=600&q=80", 500,
     "linear-gradient(135deg,#78716c,#44403c)"),
    ("Salim Ansari", "painter", 6, "Interior + exterior painting, texture work",
     "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80", 350,
     "linear-gradient(135deg,#a855f7,#7c3aed)"),
    ("Ramesh Yadav", "mechanic", 10, "2-wheeler / 4-wheeler home service",
     "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80", 300,
     "linear-gradient(135deg,#334155,#0f172a)"),
    ("Pintu Karmakar", "ac_repair", 7, "Split & window AC service, gas top-up",
     "https://images.unsplash.com/photo-1585771724684-38269d6919a1?w=600&q=80", 500,
     "linear-gradient(135deg,#38bdf8,#0284c7)"),
    ("Sabita Devi", "cleaning", 4, "Home deep-clean, kitchen degreasing, bathroom",
     "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80", 200,
     "linear-gradient(135deg,#10b981,#047857)"),
    ("Jhantu Mondal", "other", 5, "General local worker — loading, gardening, misc",
     "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80", 200,
     "linear-gradient(135deg,#f43f5e,#be123c)"),
]


async def seed_transport_and_helpers() -> None:
    if await db.transport_providers.count_documents({}) == 0:
        cities = await db.cities.find({}, {"_id": 0}).to_list(50)
        for c in cities:
            for i, (name, vtype, desc, photo, grad) in enumerate(TRANSPORT_TEMPLATE):
                await db.transport_providers.insert_one({
                    "provider_id": gen_id("trp"),
                    "owner_name": f"{name}", "photo_url": photo,
                    "gradient": grad,
                    "vehicle_type": vtype,
                    "address": f"Ward {i+1}, {c['name']}",
                    "city_id": c["city_id"],
                    "lat": c["lat"] + (i - 3) * 0.008,
                    "lng": c["lng"] + (i - 3) * 0.01,
                    "phone": f"+9198{5000000 + hash((c['name'], i)) % 9000000}",
                    "service_area": f"Within 10 km of {c['name']}",
                    "availability": "available" if i % 3 != 2 else "busy",
                    "rating": 4.0 + (i % 5) * 0.15,
                    "reviews_count": 12 + i * 5,
                    "description": desc,
                    "price_hint": f"₹{10 + i * 5}/km",
                    "is_active": True,
                    "created_at": now_utc().isoformat(),
                })
    if await db.helper_providers.count_documents({}) == 0:
        cities = await db.cities.find({}, {"_id": 0}).to_list(50)
        for c in cities:
            for i, (name, prof, exp, desc, photo, rate, grad) in enumerate(HELPER_TEMPLATE):
                await db.helper_providers.insert_one({
                    "helper_id": gen_id("hlp"),
                    "name": name, "photo_url": photo,
                    "gradient": grad,
                    "profession": prof,
                    "address": f"Ward {i+2}, {c['name']}",
                    "city_id": c["city_id"],
                    "lat": c["lat"] + (i - 4) * 0.006,
                    "lng": c["lng"] + (i - 4) * 0.008,
                    "phone": f"+9197{4000000 + hash((c['name'], prof)) % 9000000}",
                    "experience_years": exp,
                    "service_area": f"Within 8 km of {c['name']}",
                    "availability": "available" if i % 4 != 3 else "busy",
                    "rating": 4.0 + (i % 5) * 0.15,
                    "reviews_count": 8 + i * 3,
                    "description": desc,
                    "hourly_rate": rate,
                    "is_active": True,
                    "created_at": now_utc().isoformat(),
                })


async def backfill_shop_fields() -> None:
    """Add phone / status / opening_hours / closing_hours / delivery_time_min to existing shops."""
    cursor = db.shops.find({"phone": {"$exists": False}}, {"_id": 1, "shop_id": 1, "name": 1})
    async for s in cursor:
        # Generate a stable phone from shop_id hash
        h = abs(hash(s["shop_id"]))
        await db.shops.update_one({"_id": s["_id"]}, {"$set": {
            "phone": f"+9196{(3000000 + h) % 9000000:07d}",
            "opening_hours": "9:00 AM",
            "closing_hours": "10:00 PM",
            "delivery_time_min": 30,
            "status": "open",
        }})


async def seed_all() -> None:
    await ensure_indexes()
    await seed_admin()
    await seed_geography()
    await seed_shops_and_products()
    await backfill_shop_fields()
    await seed_partner_accounts()
    await seed_coupons()
    await seed_transport_and_helpers()
    # persist test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# Test Credentials

## Roles

| Role                | Email                                       | Password        |
|---------------------|---------------------------------------------|-----------------|
| Super Admin         | {os.environ['ADMIN_EMAIL']}                 | {os.environ['ADMIN_PASSWORD']} |
| Warehouse Manager 1 | wh1@shiplink.com                            | Warehouse@123   |
| Warehouse Manager 2 | wh2@shiplink.com                            | Warehouse@123   |
| Shop Owner          | shop.owner@shiplink.com                     | Shop@123        |
| Delivery Partner    | delivery.kolkata.1@shiplink.com             | Partner@123     |
| Collection Partner  | collection.kolkata.1@shiplink.com           | Partner@123     |

## Endpoints (all under `/api`)
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`,
  `/api/auth/google/session` (Emergent Google Auth)
- Admin: `/api/admin/*`
- Warehouse: `/api/warehouse/*`
- Shop: `/api/shop/*`
- Marketplace (customer): `/api/marketplace/*`
- Delivery Partner: `/api/delivery/*`
- Collection Partner: `/api/collection/*`
- Payments (Razorpay mocked): `/api/payments/*`
- Shop-app sync (mock external app): `/api/sync/*`
""")
