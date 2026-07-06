"""Delivery Partner + Collection Partner routes."""
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user, require_roles
from models import now_utc


delivery_router = APIRouter(prefix="/api/delivery", tags=["delivery-partner"])
collection_router = APIRouter(prefix="/api/collection", tags=["collection-partner"])


@delivery_router.get("/orders")
async def delivery_orders(user: dict = Depends(require_roles("delivery_partner"))):
    from db import db
    return await db.orders.find(
        {"delivery_partner_id": user["user_id"],
         "status": {"$in": ["out_for_delivery", "packed"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@delivery_router.get("/history")
async def delivery_history(user: dict = Depends(require_roles("delivery_partner"))):
    from db import db
    return await db.orders.find(
        {"delivery_partner_id": user["user_id"], "status": "delivered"},
        {"_id": 0}
    ).sort("updated_at", -1).limit(50).to_list(50)


@delivery_router.post("/orders/{oid}/status")
async def delivery_status(oid: str, body: dict,
                            user: dict = Depends(require_roles("delivery_partner"))):
    from db import db
    status = body["status"]
    o = await db.orders.find_one({"order_id": oid, "delivery_partner_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Order not assigned to you")
    await db.orders.update_one({"order_id": oid},
                                 {"$set": {"status": status,
                                            "updated_at": now_utc().isoformat()},
                                  "$push": {"timeline": {"at": now_utc().isoformat(),
                                                           "status": status,
                                                           "note": body.get("note") or f"Delivery: {status}"}}})
    return {"ok": True}


@delivery_router.get("/stats")
async def delivery_stats(user: dict = Depends(require_roles("delivery_partner"))):
    from db import db
    active = await db.orders.count_documents({"delivery_partner_id": user["user_id"],
                                                "status": {"$in": ["packed", "out_for_delivery"]}})
    done = await db.orders.count_documents({"delivery_partner_id": user["user_id"],
                                             "status": "delivered"})
    earnings_pipeline = [
        {"$match": {"delivery_partner_id": user["user_id"], "status": "delivered"}},
        {"$group": {"_id": None, "e": {"$sum": "$delivery_fee"}}},
    ]
    rev = await db.orders.aggregate(earnings_pipeline).to_list(1)
    earnings = rev[0]["e"] if rev else 0
    return {"active": active, "delivered": done, "earnings": earnings}


# ---------------- Collection Partner ----------------
@collection_router.get("/tasks")
async def collection_tasks(user: dict = Depends(require_roles("collection_partner"))):
    from db import db
    return await db.orders.find(
        {"collection_partner_id": user["user_id"],
         "status": {"$in": ["accepted", "collected"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@collection_router.post("/tasks/{oid}/pickup")
async def collection_pickup(oid: str, user: dict = Depends(require_roles("collection_partner"))):
    from db import db
    o = await db.orders.find_one({"order_id": oid, "collection_partner_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Task not assigned to you")
    await db.orders.update_one({"order_id": oid},
                                 {"$set": {"status": "collected",
                                            "updated_at": now_utc().isoformat()},
                                  "$push": {"timeline": {"at": now_utc().isoformat(),
                                                           "status": "collected",
                                                           "note": "Picked from shop"}}})
    return {"ok": True}


@collection_router.post("/tasks/{oid}/drop")
async def collection_drop(oid: str, user: dict = Depends(require_roles("collection_partner"))):
    from db import db
    o = await db.orders.find_one({"order_id": oid, "collection_partner_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Task not assigned to you")
    await db.orders.update_one({"order_id": oid},
                                 {"$set": {"status": "at_warehouse",
                                            "updated_at": now_utc().isoformat()},
                                  "$push": {"timeline": {"at": now_utc().isoformat(),
                                                           "status": "at_warehouse",
                                                           "note": "Dropped at warehouse"}}})
    return {"ok": True}


@collection_router.get("/stats")
async def collection_stats(user: dict = Depends(require_roles("collection_partner"))):
    from db import db
    active = await db.orders.count_documents({"collection_partner_id": user["user_id"],
                                                "status": {"$in": ["accepted", "collected"]}})
    done = await db.orders.count_documents({"collection_partner_id": user["user_id"],
                                             "status": {"$in": ["at_warehouse", "packed",
                                                                  "out_for_delivery", "delivered"]}})
    return {"active": active, "collected": done}
