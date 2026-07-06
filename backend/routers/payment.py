"""Razorpay payments — MOCKED for MVP (no real API calls).
The abstraction is real, so plugging in the SDK later is a single-file change."""
import os
import secrets
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user
from models import now_utc


router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/create-order")
async def create_payment(body: dict, user: dict = Depends(get_current_user)):
    """Create a Razorpay-like order for the given app order_id. MOCKED."""
    from db import db
    order_id = body["order_id"]
    o = await db.orders.find_one({"order_id": order_id, "customer_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    rzp_order_id = f"order_{secrets.token_hex(10)}"
    await db.orders.update_one({"order_id": order_id},
                                 {"$set": {"razorpay_order_id": rzp_order_id,
                                            "updated_at": now_utc().isoformat()}})
    return {
        "razorpay_order_id": rzp_order_id,
        "amount": int(round(o["total"] * 100)),
        "currency": "INR",
        "key_id": os.environ.get("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
        "mock": True,
        "message": "MOCK MODE — replace RAZORPAY_KEY_ID/SECRET in .env to enable live payments.",
    }


@router.post("/verify")
async def verify_payment(body: dict, user: dict = Depends(get_current_user)):
    """Verify signature. MOCKED — always succeeds for MVP."""
    from db import db
    order_id = body["order_id"]
    o = await db.orders.find_one({"order_id": order_id, "customer_id": user["user_id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    payment_id = body.get("razorpay_payment_id") or f"pay_{secrets.token_hex(10)}"
    await db.orders.update_one({"order_id": order_id},
                                 {"$set": {"payment_status": "paid",
                                            "razorpay_payment_id": payment_id,
                                            "updated_at": now_utc().isoformat()},
                                  "$push": {"timeline": {"at": now_utc().isoformat(),
                                                           "status": "payment_received",
                                                           "note": f"Payment via Razorpay: {payment_id}"}}})
    return {"ok": True, "payment_id": payment_id, "mock": True}
