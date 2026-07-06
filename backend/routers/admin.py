"""Super Admin routes — full platform access."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user, require_roles, hash_password
from models import (
    CityCreate, WarehouseCreate, CouponCreate, AdCreate,
    KYCUpdate, gen_id, now_utc,
)

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_roles("super_admin"))])


@router.get("/stats")
async def stats():
    from db import db
    counts = {}
    for name in ("cities", "warehouses", "shops", "products", "orders", "users"):
        counts[name] = await db[name].count_documents({})
    counts["customers"] = await db.users.count_documents({"role": "customer"})
    counts["shop_owners"] = await db.users.count_documents({"role": "shop_owner"})
    counts["delivery_partners"] = await db.users.count_documents({"role": "delivery_partner"})
    counts["collection_partners"] = await db.users.count_documents({"role": "collection_partner"})
    counts["pending_kyc"] = await db.users.count_documents({"kyc_status": "pending"})
    counts["active_orders"] = await db.orders.count_documents({"status": {"$nin": ["delivered", "cancelled"]}})
    revenue_pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]
    rev = await db.orders.aggregate(revenue_pipeline).to_list(1)
    counts["revenue"] = rev[0]["total"] if rev else 0
    # revenue by city for chart
    by_city = await db.orders.aggregate([
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": "$city_id", "revenue": {"$sum": "$total"}, "orders": {"$sum": 1}}},
    ]).to_list(20)
    cities = {c["city_id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(50)}
    counts["by_city"] = [{"city": cities.get(x["_id"], "Unknown"),
                            "revenue": x["revenue"], "orders": x["orders"]} for x in by_city]
    return counts


# ---- Cities ----
@router.get("/cities")
async def list_cities():
    from db import db
    return await db.cities.find({}, {"_id": 0}).to_list(200)


@router.post("/cities")
async def create_city(body: CityCreate):
    from db import db
    doc = {"city_id": gen_id("city"), **body.model_dump(),
           "is_active": True, "created_at": now_utc().isoformat()}
    await db.cities.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/cities/{city_id}")
async def update_city(city_id: str, body: dict):
    from db import db
    body.pop("_id", None)
    body.pop("city_id", None)
    await db.cities.update_one({"city_id": city_id}, {"$set": body})
    return {"ok": True}


@router.delete("/cities/{city_id}")
async def delete_city(city_id: str):
    from db import db
    await db.cities.update_one({"city_id": city_id}, {"$set": {"is_active": False}})
    return {"ok": True}


# ---- Warehouses ----
@router.get("/warehouses")
async def list_warehouses():
    from db import db
    whs = await db.warehouses.find({}, {"_id": 0}).to_list(200)
    cities = {c["city_id"]: c["name"] for c in await db.cities.find({}, {"_id": 0}).to_list(200)}
    for w in whs:
        w["city_name"] = cities.get(w.get("city_id"), "-")
        if w.get("manager_id"):
            m = await db.users.find_one({"user_id": w["manager_id"]}, {"_id": 0, "name": 1, "email": 1})
            w["manager"] = m
    return whs


@router.post("/warehouses")
async def create_warehouse(body: WarehouseCreate):
    from db import db
    doc = {"warehouse_id": gen_id("wh"), **body.model_dump(),
           "manager_id": None, "is_active": True, "created_at": now_utc().isoformat()}
    await db.warehouses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/warehouses/{wid}")
async def update_warehouse(wid: str, body: dict):
    from db import db
    body.pop("_id", None)
    body.pop("warehouse_id", None)
    await db.warehouses.update_one({"warehouse_id": wid}, {"$set": body})
    return {"ok": True}


@router.post("/warehouses/{wid}/assign-manager")
async def assign_manager(wid: str, body: dict):
    from db import db
    manager_id = body.get("user_id")
    user = await db.users.find_one({"user_id": manager_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": manager_id},
                                {"$set": {"role": "warehouse_manager", "warehouse_id": wid}})
    await db.warehouses.update_one({"warehouse_id": wid}, {"$set": {"manager_id": manager_id}})
    return {"ok": True}


# ---- Users / KYC ----
@router.get("/users")
async def list_users(role: str | None = None):
    from db import db
    q = {"role": role} if role else {}
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@router.patch("/users/{uid}/kyc")
async def update_kyc(uid: str, body: KYCUpdate):
    from db import db
    await db.users.update_one({"user_id": uid},
                                {"$set": {"kyc_status": body.status, "kyc_note": body.note}})
    return {"ok": True}


@router.patch("/users/{uid}/role")
async def change_role(uid: str, body: dict):
    from db import db
    role = body.get("role")
    if role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot promote to super_admin via API")
    update = {"role": role}
    if role == "warehouse_manager" and body.get("warehouse_id"):
        update["warehouse_id"] = body["warehouse_id"]
    await db.users.update_one({"user_id": uid}, {"$set": update})
    return {"ok": True}


@router.post("/users")
async def create_staff(body: dict):
    """Super admin can create staff accounts (warehouse manager / partners)."""
    from db import db
    email = body["email"].lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email exists")
    doc = {
        "user_id": gen_id("usr"), "email": email,
        "password_hash": hash_password(body.get("password", "Password@123")),
        "name": body["name"], "role": body["role"],
        "warehouse_id": body.get("warehouse_id"),
        "city_id": body.get("city_id"),
        "phone": body.get("phone"),
        "kyc_status": "approved", "is_active": True,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---- Shops ----
@router.get("/shops")
async def list_shops():
    from db import db
    shops = await db.shops.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return shops


# ---- Orders ----
@router.get("/orders")
async def list_orders(status: str | None = None, city_id: str | None = None):
    from db import db
    q = {}
    if status:
        q["status"] = status
    if city_id:
        q["city_id"] = city_id
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(300).to_list(300)


@router.post("/orders/{oid}/transfer")
async def transfer_order(oid: str, body: dict):
    from db import db
    from models import TimelineEvent
    wid = body["warehouse_id"]
    wh = await db.warehouses.find_one({"warehouse_id": wid}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    event = {"at": now_utc().isoformat(), "status": "transferred",
             "note": f"Transferred to {wh['name']}"}
    await db.orders.update_one({"order_id": oid},
                                {"$set": {"warehouse_id": wid, "warehouse_name": wh["name"],
                                          "updated_at": now_utc().isoformat()},
                                 "$push": {"timeline": event}})
    return {"ok": True}


# ---- Coupons ----
@router.get("/coupons")
async def list_coupons():
    from db import db
    return await db.coupons.find({}, {"_id": 0}).to_list(200)


@router.post("/coupons")
async def create_coupon(body: CouponCreate):
    from db import db
    data = body.model_dump()
    if data.get("expires_at"):
        data["expires_at"] = data["expires_at"].isoformat() if isinstance(data["expires_at"], datetime) else data["expires_at"]
    doc = {"coupon_id": gen_id("cpn"), **data, "is_active": True,
           "created_at": now_utc().isoformat()}
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/coupons/{cid}")
async def del_coupon(cid: str):
    from db import db
    await db.coupons.update_one({"coupon_id": cid}, {"$set": {"is_active": False}})
    return {"ok": True}


# ---- Ads ----
@router.get("/ads")
async def list_ads():
    from db import db
    return await db.ads.find({}, {"_id": 0}).to_list(100)


@router.post("/ads")
async def create_ad(body: AdCreate):
    from db import db
    doc = {"ad_id": gen_id("ad"), **body.model_dump(),
           "is_active": True, "created_at": now_utc().isoformat()}
    await db.ads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/ads/{aid}")
async def del_ad(aid: str):
    from db import db
    await db.ads.update_one({"ad_id": aid}, {"$set": {"is_active": False}})
    return {"ok": True}


# ---- Live Map ----
@router.get("/live-map")
async def live_map():
    from db import db
    warehouses = await db.warehouses.find({"is_active": True}, {"_id": 0}).to_list(500)
    shops = await db.shops.find({"is_active": True}, {"_id": 0, "shop_id": 1, "name": 1,
                                                        "lat": 1, "lng": 1, "city_id": 1,
                                                        "category": 1}).to_list(500)
    partners = await db.users.find(
        {"role": {"$in": ["delivery_partner", "collection_partner"]}, "lat": {"$ne": None}},
        {"_id": 0, "user_id": 1, "name": 1, "lat": 1, "lng": 1, "role": 1, "city_id": 1}
    ).to_list(500)
    active_orders = await db.orders.find(
        {"status": {"$nin": ["delivered", "cancelled"]}},
        {"_id": 0, "order_id": 1, "delivery_lat": 1, "delivery_lng": 1,
         "status": 1, "warehouse_id": 1, "city_id": 1}
    ).to_list(500)
    cities = await db.cities.find({}, {"_id": 0}).to_list(50)
    return {"warehouses": warehouses, "shops": shops, "partners": partners,
            "orders": active_orders, "cities": cities}
