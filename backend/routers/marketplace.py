"""Public marketplace routes — customers browse shops, place orders, view own orders."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from auth import get_current_user, require_roles
from geo import location_provider
from models import OrderCreate, RatingRequest, gen_id, now_utc


router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("/cities")
async def cities():
    from db import db
    return await db.cities.find({"is_active": True}, {"_id": 0}).to_list(200)


@router.get("/shops")
async def shops(city_id: Optional[str] = None, category: Optional[str] = None,
                 q: Optional[str] = Query(None), limit: int = 50):
    from db import db
    query = {"is_active": True}
    if city_id:
        query["city_id"] = city_id
    if category and category != "all":
        query["category"] = category
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    return await db.shops.find(query, {"_id": 0}).limit(limit).to_list(limit)


@router.get("/shops/{shop_id}")
async def shop_detail(shop_id: str):
    from db import db
    shop = await db.shops.find_one({"shop_id": shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    products = await db.products.find({"shop_id": shop_id, "is_active": True},
                                        {"_id": 0}).to_list(500)
    return {"shop": shop, "products": products}


@router.get("/products")
async def all_products(city_id: Optional[str] = None, q: Optional[str] = None, limit: int = 60):
    from db import db
    query = {"is_active": True}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    # attach shop info
    shop_ids = list({p["shop_id"] for p in products})
    shops_by_id = {s["shop_id"]: s for s in
                    await db.shops.find({"shop_id": {"$in": shop_ids}}, {"_id": 0}).to_list(500)}
    for p in products:
        s = shops_by_id.get(p["shop_id"], {})
        p["shop_name"] = s.get("name")
        p["shop_city_id"] = s.get("city_id")
    if city_id:
        products = [p for p in products if p.get("shop_city_id") == city_id]
    return products


@router.get("/categories")
async def categories():
    return [
        {"id": "grocery", "name": "Grocery", "icon": "ShoppingCart"},
        {"id": "electronics", "name": "Electronics", "icon": "Laptop"},
        {"id": "fashion", "name": "Fashion", "icon": "TShirt"},
        {"id": "pharmacy", "name": "Pharmacy", "icon": "FirstAid"},
        {"id": "food", "name": "Food", "icon": "ForkKnife"},
    ]


@router.get("/ads")
async def ads(city_id: Optional[str] = None):
    from db import db
    q = {"is_active": True}
    if city_id:
        q["$or"] = [{"city_id": city_id}, {"city_id": None}]
    return await db.ads.find(q, {"_id": 0}).to_list(20)


@router.post("/orders")
async def place_order(body: OrderCreate, user: dict = Depends(get_current_user)):
    """Place an order. Auto-selects nearest warehouse based on delivery lat/lng."""
    from db import db
    shop = await db.shops.find_one({"shop_id": body.shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    # find nearest warehouse in same city, within service radius, with capacity
    candidates = await db.warehouses.find(
        {"city_id": shop["city_id"], "is_active": True}, {"_id": 0}
    ).to_list(200)
    warehouse = location_provider.nearest(body.delivery_lat, body.delivery_lng,
                                            candidates, radius_key="service_radius_km")
    if not warehouse:
        # fallback: nearest across all cities
        candidates = await db.warehouses.find({"is_active": True}, {"_id": 0}).to_list(200)
        warehouse = location_provider.nearest(body.delivery_lat, body.delivery_lng, candidates)
    if not warehouse:
        raise HTTPException(status_code=400, detail="No warehouse available for this location")

    # compute totals
    subtotal = sum(i.price * i.qty for i in body.items)
    discount = 0.0
    if body.coupon_code:
        cpn = await db.coupons.find_one({"code": body.coupon_code.upper(),
                                            "is_active": True}, {"_id": 0})
        if cpn and subtotal >= cpn.get("min_order", 0):
            discount = min(subtotal * cpn["discount_percent"] / 100, cpn.get("max_discount", 500))
    delivery_fee = 30.0
    total = round(subtotal - discount + delivery_fee, 2)

    order_id = gen_id("ord")
    doc = {
        "order_id": order_id,
        "customer_id": user["user_id"], "customer_name": user["name"],
        "shop_id": shop["shop_id"], "shop_name": shop["name"],
        "warehouse_id": warehouse["warehouse_id"], "warehouse_name": warehouse["name"],
        "city_id": shop["city_id"],
        "items": [i.model_dump() for i in body.items],
        "subtotal": subtotal, "delivery_fee": delivery_fee,
        "discount": discount, "total": total,
        "status": "placed",
        "delivery_address": body.delivery_address,
        "delivery_lat": body.delivery_lat, "delivery_lng": body.delivery_lng,
        "payment_method": body.payment_method,
        "payment_status": "pending",
        "notes": body.notes,
        "timeline": [{"at": now_utc().isoformat(), "status": "placed",
                       "note": f"Order placed and routed to {warehouse['name']}"}],
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    from db import db
    return await db.orders.find({"customer_id": user["user_id"]},
                                  {"_id": 0}).sort("created_at", -1).to_list(200)


@router.get("/orders/{oid}")
async def my_order(oid: str, user: dict = Depends(get_current_user)):
    from db import db
    o = await db.orders.find_one({"order_id": oid, "customer_id": user["user_id"]},
                                   {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@router.post("/orders/{oid}/rate")
async def rate_order(oid: str, body: RatingRequest, user: dict = Depends(get_current_user)):
    from db import db
    o = await db.orders.find_one({"order_id": oid, "customer_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"order_id": oid},
                                {"$set": {"rating": body.rating, "review": body.review}})
    # update shop's rolling rating (simple)
    shop = await db.shops.find_one({"shop_id": o["shop_id"]})
    if shop:
        rc = shop.get("reviews_count", 0)
        new_count = rc + 1
        new_rating = (shop.get("rating", 4.0) * rc + body.rating) / new_count
        await db.shops.update_one({"shop_id": shop["shop_id"]},
                                    {"$set": {"rating": round(new_rating, 2),
                                              "reviews_count": new_count}})
    return {"ok": True}
