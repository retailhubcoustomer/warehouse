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


async def seed_all() -> None:
    await ensure_indexes()
    await seed_admin()
    await seed_geography()
    await seed_shops_and_products()
    await seed_partner_accounts()
    await seed_coupons()
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
