"""Standalone seed script.

Usage:
    cd backend
    python seed.py            # idempotent — safe to re-run
    python seed.py --wipe     # drop demo collections before seeding

Reads MONGO_URL / DB_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from `.env`.
"""
import argparse
import asyncio
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wipe", action="store_true",
                         help="Drop demo collections before seeding")
    args = parser.parse_args()

    from db import db, seed_all

    if args.wipe:
        print("[seed] Wiping demo collections…")
        for c in ("cities", "warehouses", "shops", "products", "coupons",
                    "transport_providers", "helper_providers"):
            await db[c].drop()

    print("[seed] Running seed_all()…")
    await seed_all()
    print("[seed] Done. Credentials written to /app/memory/test_credentials.md")


if __name__ == "__main__":
    asyncio.run(main())
