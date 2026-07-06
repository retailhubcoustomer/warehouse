"""Shop Owner routes + shop-app sync endpoints (mock external Shop App integration)."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from auth import get_current_user, require_roles
from models import ProductCreate, gen_id, now_utc


router = APIRouter(prefix="/api/shop", tags=["shop"])


async def _shop(user: dict) -> str:
    sid = user.get("shop_id")
    if not sid:
        raise HTTPException(status_code=403, detail="No shop linked to this account")
    return sid


@router.get("/me")
async def shop_me(user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    shop = await db.shops.find_one({"shop_id": sid}, {"_id": 0})
    return shop


@router.get("/dashboard")
async def shop_dashboard(user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    counts = {
        "products": await db.products.count_documents({"shop_id": sid}),
        "orders_today": await db.orders.count_documents({"shop_id": sid}),
        "active": await db.orders.count_documents(
            {"shop_id": sid, "status": {"$nin": ["delivered", "cancelled"]}}),
    }
    rev = await db.orders.aggregate([
        {"$match": {"shop_id": sid, "status": "delivered"}},
        {"$group": {"_id": None, "t": {"$sum": "$total"}}},
    ]).to_list(1)
    counts["revenue"] = rev[0]["t"] if rev else 0
    return counts


@router.get("/products")
async def shop_products(user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    return await db.products.find({"shop_id": sid}, {"_id": 0}).to_list(500)


@router.post("/products")
async def add_product(body: ProductCreate, user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    doc = {"product_id": gen_id("prd"), "shop_id": sid,
           **body.model_dump(), "is_active": True,
           "created_at": now_utc().isoformat()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/products/{pid}")
async def update_product(pid: str, body: dict,
                          user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    body.pop("_id", None)
    body.pop("product_id", None)
    body.pop("shop_id", None)
    r = await db.products.update_one({"product_id": pid, "shop_id": sid}, {"$set": body})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@router.delete("/products/{pid}")
async def del_product(pid: str, user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    await db.products.update_one({"product_id": pid, "shop_id": sid},
                                   {"$set": {"is_active": False}})
    return {"ok": True}


@router.get("/orders")
async def shop_orders(status: Optional[str] = None,
                      user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    q = {"shop_id": sid}
    if status:
        q["status"] = status
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)


@router.post("/orders/{oid}/accept")
async def shop_accept(oid: str, user: dict = Depends(require_roles("shop_owner"))):
    from db import db
    sid = await _shop(user)
    o = await db.orders.find_one({"order_id": oid, "shop_id": sid})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"order_id": oid},
                                {"$set": {"status": "accepted",
                                          "updated_at": now_utc().isoformat()},
                                 "$push": {"timeline": {"at": now_utc().isoformat(),
                                                          "status": "accepted",
                                                          "note": "Shop confirmed order"}}})
    return {"ok": True}


# ==================== SHOP-APP SYNC (mock external Shop Website/App) ====================
# These endpoints simulate the existing Zomato-style Shop App integration.
# The Shop App and this marketplace share the SAME database (this backend),
# so all updates propagate automatically. In production these would be
# webhooks/message-bus events between the two systems.
sync_router = APIRouter(prefix="/api/sync", tags=["shop-app-sync"])


@sync_router.get("/health")
async def sync_health():
    return {"status": "ok", "mode": "shared-database", "message": "Shop App integrated"}


@sync_router.get("/shop/{shop_id}/orders")
async def sync_pull_orders(shop_id: str, since: Optional[str] = None):
    """External Shop App polls new orders. Uses shared DB."""
    from db import db
    q = {"shop_id": shop_id}
    if since:
        q["created_at"] = {"$gt": since}
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@sync_router.post("/shop/{shop_id}/products")
async def sync_push_products(shop_id: str, body: dict):
    """External Shop App pushes bulk product updates."""
    from db import db
    products = body.get("products", [])
    upserted = 0
    for p in products:
        pid = p.get("product_id") or gen_id("prd")
        p["product_id"] = pid
        p["shop_id"] = shop_id
        p.setdefault("is_active", True)
        p["updated_at"] = now_utc().isoformat()
        await db.products.update_one({"product_id": pid},
                                       {"$setOnInsert": {"created_at": now_utc().isoformat()},
                                        "$set": p}, upsert=True)
        upserted += 1
    return {"ok": True, "upserted": upserted}


@sync_router.post("/shop/{shop_id}/inventory")
async def sync_push_inventory(shop_id: str, body: dict):
    from db import db
    for item in body.get("items", []):
        await db.products.update_one({"product_id": item["product_id"], "shop_id": shop_id},
                                       {"$set": {"stock": item["stock"],
                                                  "updated_at": now_utc().isoformat()}})
    return {"ok": True}


@sync_router.post("/order/{order_id}/status")
async def sync_order_status(order_id: str, body: dict):
    """External Shop App updates an order status back into the marketplace."""
    from db import db
    status = body["status"]
    await db.orders.update_one({"order_id": order_id},
                                 {"$set": {"status": status,
                                            "updated_at": now_utc().isoformat()},
                                  "$push": {"timeline": {"at": now_utc().isoformat(),
                                                           "status": status,
                                                           "note": "Updated by Shop App"}}})
    return {"ok": True}
