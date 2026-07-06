"""Warehouse Manager routes — scoped to their own warehouse only."""
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user, require_roles
from models import now_utc


router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


async def _wh(user: dict) -> str:
    wid = user.get("warehouse_id")
    if not wid:
        raise HTTPException(status_code=403, detail="No warehouse assigned")
    return wid


@router.get("/me")
async def wh_me(user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    wh = await db.warehouses.find_one({"warehouse_id": wid}, {"_id": 0})
    return wh


@router.get("/dashboard")
async def wh_dashboard(user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    counts = {}
    for s in ("placed", "accepted", "collected", "at_warehouse", "packed", "out_for_delivery", "delivered"):
        counts[s] = await db.orders.count_documents({"warehouse_id": wid, "status": s})
    counts["today_orders"] = await db.orders.count_documents({"warehouse_id": wid})
    rev = await db.orders.aggregate([
        {"$match": {"warehouse_id": wid, "status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]).to_list(1)
    counts["revenue"] = rev[0]["total"] if rev else 0
    counts["staff"] = await db.users.count_documents({"warehouse_id": wid,
                                                       "role": "warehouse_manager"})
    return counts


@router.get("/orders")
async def wh_orders(status: str | None = None,
                    user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    q = {"warehouse_id": wid}
    if status:
        q["status"] = status
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)


async def _push_status(oid: str, status: str, note: str | None = None,
                        extra: dict | None = None) -> None:
    from db import db
    update = {"status": status, "updated_at": now_utc().isoformat()}
    if extra:
        update.update(extra)
    event = {"at": now_utc().isoformat(), "status": status, "note": note}
    await db.orders.update_one({"order_id": oid},
                                {"$set": update, "$push": {"timeline": event}})


@router.post("/orders/{oid}/pack")
async def wh_pack(oid: str, user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    o = await db.orders.find_one({"order_id": oid, "warehouse_id": wid})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    await _push_status(oid, "packed", "Packed at warehouse")
    return {"ok": True}


@router.post("/orders/{oid}/assign-delivery")
async def wh_assign_delivery(oid: str, body: dict,
                              user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    o = await db.orders.find_one({"order_id": oid, "warehouse_id": wid})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    partner_id = body["partner_id"]
    partner = await db.users.find_one({"user_id": partner_id, "role": "delivery_partner"})
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    await _push_status(oid, "out_for_delivery",
                        f"Assigned to {partner['name']}",
                        {"delivery_partner_id": partner_id})
    return {"ok": True}


@router.post("/orders/{oid}/assign-collection")
async def wh_assign_collection(oid: str, body: dict,
                                user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    o = await db.orders.find_one({"order_id": oid, "warehouse_id": wid})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    partner_id = body["partner_id"]
    partner = await db.users.find_one({"user_id": partner_id, "role": "collection_partner"})
    if not partner:
        raise HTTPException(status_code=404, detail="Collection partner not found")
    await db.orders.update_one({"order_id": oid},
                                {"$set": {"collection_partner_id": partner_id,
                                          "updated_at": now_utc().isoformat()},
                                 "$push": {"timeline": {"at": now_utc().isoformat(),
                                                          "status": "collection_assigned",
                                                          "note": f"Collection by {partner['name']}"}}})
    return {"ok": True}


@router.get("/inventory")
async def wh_inventory(user: dict = Depends(require_roles("warehouse_manager"))):
    """Aggregate stock of products across all shops assigned to this warehouse."""
    from db import db
    wid = await _wh(user)
    shops = await db.shops.find({"warehouse_id": wid}, {"_id": 0, "shop_id": 1, "name": 1}).to_list(500)
    shop_ids = [s["shop_id"] for s in shops]
    shop_names = {s["shop_id"]: s["name"] for s in shops}
    products = await db.products.find({"shop_id": {"$in": shop_ids}},
                                        {"_id": 0}).sort("stock", 1).to_list(1000)
    for p in products:
        p["shop_name"] = shop_names.get(p["shop_id"], "-")
    return products


@router.get("/staff")
async def wh_staff(user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    return await db.users.find({"warehouse_id": wid}, {"_id": 0, "password_hash": 0}).to_list(200)


@router.get("/partners")
async def wh_partners(role: str = "delivery_partner",
                      user: dict = Depends(require_roles("warehouse_manager"))):
    from db import db
    wid = await _wh(user)
    wh = await db.warehouses.find_one({"warehouse_id": wid}, {"_id": 0, "city_id": 1})
    q = {"role": role, "is_active": True}
    if wh and wh.get("city_id"):
        q["city_id"] = wh["city_id"]
    return await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(200)
