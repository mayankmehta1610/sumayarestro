import csv
import io
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.schemas.common import apply_tenant_filter, get_or_404, paginate


def make_crud_router(
    prefix: str,
    model: type[Base],
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    response_schema: type[BaseModel],
    tag: str,
    extra_filters: Callable | None = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    class StatusUpdate(BaseModel):
        status: str

    @router.get("/list", response_model=dict)
    async def list_items(
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        search: str | None = None,
        status_filter: str | None = Query(None, alias="status"),
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        query = select(model).where(model.status != "deleted")
        query = apply_tenant_filter(query, model, user)
        if status_filter:
            query = query.where(model.status == status_filter)
        if extra_filters:
            query = extra_filters(query, search)
        query = query.order_by(model.created_at.desc())
        data = await paginate(db, query, page, page_size)
        data["items"] = [response_schema.model_validate(i) for i in data["items"]]
        return data

    @router.post("/create", response_model=response_schema, status_code=status.HTTP_201_CREATED)
    async def create_item(
        payload: create_schema,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        data = payload.model_dump(exclude_unset=True)
        if hasattr(model, "restaurant_id") and user.get("restaurant_id") and "restaurant_id" not in data:
            data["restaurant_id"] = UUID(user["restaurant_id"])
        if hasattr(model, "branch_id") and user.get("branch_id") and "branch_id" not in data:
            data["branch_id"] = UUID(user["branch_id"])
        if hasattr(model, "created_by"):
            data["created_by"] = UUID(user["id"])
        item = model(**data)
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return response_schema.model_validate(item)

    @router.get("/detail/{item_id}", response_model=response_schema)
    async def get_item(
        item_id: UUID,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        item = await get_or_404(db, model, item_id, user)
        return response_schema.model_validate(item)

    @router.patch("/update/{item_id}", response_model=response_schema)
    async def update_item(
        item_id: UUID,
        payload: update_schema,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        item = await get_or_404(db, model, item_id, user)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        if hasattr(item, "updated_by"):
            item.updated_by = UUID(user["id"])
        item.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(item)
        return response_schema.model_validate(item)

    @router.patch("/status/{item_id}", response_model=response_schema)
    async def update_status(
        item_id: UUID,
        payload: StatusUpdate,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        item = await get_or_404(db, model, item_id, user)
        item.status = payload.status
        if hasattr(item, "updated_by"):
            item.updated_by = UUID(user["id"])
        await db.flush()
        await db.refresh(item)
        return response_schema.model_validate(item)

    @router.get("/export")
    async def export_items(
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(get_current_user),
    ):
        query = select(model).where(model.status != "deleted")
        query = apply_tenant_filter(query, model, user)
        result = await db.execute(query.order_by(model.created_at.desc()).limit(5000))
        items = result.scalars().all()
        if not items:
            return {"csv": ""}
        rows = [response_schema.model_validate(i).model_dump() for i in items]
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        for row in rows:
            writer.writerow({k: str(v) if isinstance(v, (UUID, datetime)) else v for k, v in row.items()})
        return {"csv": output.getvalue(), "count": len(rows)}

    return router


def entity_schemas(name: str, extra_fields: dict[str, Any] | None = None):
    extra = extra_fields or {}

    class EntityBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
        restaurant_id: UUID | None = None
        branch_id: UUID | None = None
        status: str = "active"

    class EntityCreate(EntityBase):
        pass

    class EntityUpdate(BaseModel):
        model_config = ConfigDict(from_attributes=True)
        status: str | None = None

    class EntityResponse(EntityBase):
        id: UUID
        created_at: datetime | None = None
        updated_at: datetime | None = None

    for field_name, field_type in extra.items():
        EntityCreate.model_fields[field_name] = Field(default=...)
        EntityCreate.__annotations__[field_name] = field_type
        EntityUpdate.model_fields[field_name] = Field(default=None)
        EntityUpdate.__annotations__[field_name] = field_type | None
        EntityResponse.model_fields[field_name] = Field(default=...)
        EntityResponse.__annotations__[field_name] = field_type

    EntityCreate.__name__ = f"{name}Create"
    EntityUpdate.__name__ = f"{name}Update"
    EntityResponse.__name__ = f"{name}Response"
    return EntityCreate, EntityUpdate, EntityResponse
