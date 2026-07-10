import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine, ensure_schema


async def _init_database(retries: int = 30, delay: float = 2.0) -> None:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            await ensure_schema()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:
            last_error = exc
            if attempt < retries - 1:
                await asyncio.sleep(delay)
    raise RuntimeError("Database unavailable after retries") from last_error


async def _ensure_demo_data() -> None:
    """Seed demo data when database is empty (safe for Render cold starts)."""
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models import Tenant

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).limit(1))
        if result.scalar_one_or_none():
            return

    import os
    import sys

    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    from seed import seed

    try:
        await seed(force=False)
        print("Demo data seeded on startup (empty database).")
    except Exception as exc:
        print(f"WARN: startup seed failed: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_database()
    if settings.seed_on_startup:
        await _ensure_demo_data()
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "app": settings.app_name,
            "database": "connected",
            "schema": settings.db_schema,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "app": settings.app_name, "database": str(exc)},
        )
