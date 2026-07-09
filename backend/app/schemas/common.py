from typing import Any, Generic, TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[ModelT]):
    items: list[Any]
    total: int
    page: int
    page_size: int
    pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items = result.scalars().all()
    pages = (total + page_size - 1) // page_size if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def apply_tenant_filter(query: Select, model: type[Base], user: dict) -> Select:
    role = user.get("role")
    if role == "super_admin":
        return query
    restaurant_id = user.get("restaurant_id")
    branch_id = user.get("branch_id")
    if restaurant_id and hasattr(model, "restaurant_id"):
        query = query.where(model.restaurant_id == UUID(restaurant_id))
    if branch_id and hasattr(model, "branch_id") and role not in ("restaurant_owner", "super_admin"):
        query = query.where(model.branch_id == UUID(branch_id))
    return query


async def get_or_404(db: AsyncSession, model: type[ModelT], item_id: UUID, user: dict) -> ModelT:
    query = select(model).where(model.id == item_id)
    query = apply_tenant_filter(query, model, user)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return item
