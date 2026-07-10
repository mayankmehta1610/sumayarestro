"""One-time demo setup — only seeds when database is empty."""
import os
import sys

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Tenant

router = APIRouter(prefix="/setup", tags=["setup"])


@router.post("/seed-demo")
async def seed_demo_if_empty():
    """Seed demo data when no tenants exist. Safe to call after empty deploy."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).limit(1))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Database already has data")

    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    from seed import seed

    await seed(force=False)
    return {"status": "ok", "message": "Demo data seeded successfully"}


@router.get("/status")
async def setup_status():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
    return {"seeded": tenant is not None, "tenant": tenant.slug if tenant else None}
