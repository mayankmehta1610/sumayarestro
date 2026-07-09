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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_database()
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
