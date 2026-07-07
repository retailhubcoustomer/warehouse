"""User self-service routes: profile, preferences, cart, notifications.
All routes require an authenticated user (any role)."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user, hash_password, verify_password
from models import (
    ProfileUpdate, PasswordChange, UserPreferences, CartUpsert,
    NotificationRead, gen_id, now_utc,
)


user_router = APIRouter(prefix="/api/user", tags=["user"])
cart_router = APIRouter(prefix="/api/cart", tags=["cart"])
notif_router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ==================== PROFILE ====================
@user_router.patch("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    from db import db
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        return {"ok": True}
    update["updated_at"] = now_utc().isoformat()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    fresh = await db.users.find_one({"user_id": user["user_id"]},
                                      {"_id": 0, "password_hash": 0})
    return fresh


@user_router.post("/password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    from db import db
    full = await db.users.find_one({"user_id": user["user_id"]})
    # Google-only account may not have a password yet
    if full.get("password_hash"):
        if not body.old_password or not verify_password(body.old_password, full["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"user_id": user["user_id"]},
                                {"$set": {"password_hash": hash_password(body.new_password),
                                            "updated_at": now_utc().isoformat()}})
    return {"ok": True}


# ==================== PREFERENCES ====================
@user_router.get("/preferences")
async def get_prefs(user: dict = Depends(get_current_user)):
    from db import db
    p = await db.user_preferences.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not p:
        p = UserPreferences().model_dump()
        p["user_id"] = user["user_id"]
        p["city_id"] = user.get("city_id")
        p["created_at"] = now_utc().isoformat()
        await db.user_preferences.insert_one(p)
        p.pop("_id", None)
    return {k: v for k, v in p.items() if k != "user_id"}


@user_router.patch("/preferences")
async def update_prefs(body: UserPreferences, user: dict = Depends(get_current_user)):
    from db import db
    data = body.model_dump()
    data["updated_at"] = now_utc().isoformat()
    await db.user_preferences.update_one(
        {"user_id": user["user_id"]},
        {"$set": data, "$setOnInsert": {"user_id": user["user_id"],
                                           "created_at": now_utc().isoformat()}},
        upsert=True,
    )
    return {"ok": True}


# ==================== CART ====================
@cart_router.get("")
async def get_cart(user: dict = Depends(get_current_user)):
    from db import db
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0})
    return cart or {"shop_id": None, "shop_name": None, "items": []}


@cart_router.put("")
async def put_cart(body: CartUpsert, user: dict = Depends(get_current_user)):
    from db import db
    doc = body.model_dump()
    doc["items"] = [i for i in doc["items"] if i["qty"] > 0]
    doc["updated_at"] = now_utc().isoformat()
    if not doc["items"]:
        doc["shop_id"] = None
        doc["shop_name"] = None
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": doc, "$setOnInsert": {"user_id": user["user_id"],
                                           "created_at": now_utc().isoformat()}},
        upsert=True,
    )
    return {"ok": True, "count": sum(i["qty"] for i in doc["items"])}


@cart_router.delete("")
async def clear_cart(user: dict = Depends(get_current_user)):
    from db import db
    await db.carts.delete_one({"user_id": user["user_id"]})
    return {"ok": True}


# ==================== NOTIFICATIONS ====================
@notif_router.get("")
async def list_notifications(unread_only: bool = False,
                              user: dict = Depends(get_current_user)):
    from db import db
    q = {"user_id": user["user_id"]}
    if unread_only:
        q["read"] = False
    return await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)


@notif_router.post("/read")
async def mark_read(body: NotificationRead, user: dict = Depends(get_current_user)):
    from db import db
    q = {"user_id": user["user_id"], "read": False}
    if body.ids:
        q["notif_id"] = {"$in": body.ids}
    r = await db.notifications.update_many(q, {"$set": {"read": True,
                                                           "read_at": now_utc().isoformat()}})
    return {"ok": True, "marked": r.modified_count}


@notif_router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    from db import db
    n = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"count": n}


# Helper used by other routers to push a notification when order status changes
async def push_notification(user_id: str, title: str, body: str,
                             kind: str = "info", order_id: str | None = None) -> None:
    from db import db
    await db.notifications.insert_one({
        "notif_id": gen_id("ntf"),
        "user_id": user_id,
        "title": title,
        "body": body,
        "kind": kind,
        "order_id": order_id,
        "read": False,
        "created_at": now_utc().isoformat(),
    })
