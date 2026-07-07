"""ShipLink backend — Multi-city warehouse marketplace with shop integration."""
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# routers
from auth import router as auth_router
from routers.admin import router as admin_router
from routers.warehouse import router as warehouse_router
from routers.marketplace import router as marketplace_router
from routers.shop import router as shop_router, sync_router
from routers.partner import delivery_router, collection_router
from routers.payment import router as payment_router
from routers.user import user_router, cart_router, notif_router

logging.basicConfig(level=logging.INFO,
                     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("shiplink")

app = FastAPI(title="ShipLink API", version="1.0.0")


@app.get("/api/")
async def api_root():
    return {"service": "ShipLink", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"ok": True}


# order matters — routers already carry /api prefix
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(warehouse_router)
app.include_router(marketplace_router)
app.include_router(shop_router)
app.include_router(sync_router)
app.include_router(delivery_router)
app.include_router(collection_router)
app.include_router(payment_router)
app.include_router(user_router)
app.include_router(cart_router)
app.include_router(notif_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    from db import seed_all
    try:
        await seed_all()
        logger.info("ShipLink seed complete")
    except Exception as e:
        logger.exception("Seed failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    from db import client
    client.close()
