from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models import User
from app.schemas.common import apply_tenant_filter, get_or_404, paginate
from app.schemas.entities import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/list")
async def list_staff(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = select(User).where(User.status != "deleted")
    query = apply_tenant_filter(query, User, user)
    query = query.order_by(User.created_at.desc())
    data = await paginate(db, query, page, page_size)
    data["items"] = [UserResponse.model_validate(i) for i in data["items"]]
    return data


@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    data = payload.model_dump(exclude={"password"})
    data["password_hash"] = hash_password(payload.password)
    if user.get("restaurant_id") and not data.get("restaurant_id"):
        data["restaurant_id"] = UUID(user["restaurant_id"])
    if user.get("branch_id") and not data.get("branch_id"):
        data["branch_id"] = UUID(user["branch_id"])
    data["created_by"] = UUID(user["id"])
    staff = User(**data)
    db.add(staff)
    await db.flush()
    await db.refresh(staff)
    return UserResponse.model_validate(staff)


@router.get("/detail/{item_id}", response_model=UserResponse)
async def get_staff(item_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    item = await get_or_404(db, User, item_id, user)
    return UserResponse.model_validate(item)


@router.patch("/update/{item_id}", response_model=UserResponse)
async def update_staff(
    item_id: UUID, payload: UserUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)
):
    item = await get_or_404(db, User, item_id, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    item.updated_by = UUID(user["id"])
    item.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(item)
    return UserResponse.model_validate(item)


@router.patch("/status/{item_id}", response_model=UserResponse)
async def staff_status(
    item_id: UUID, payload: StatusUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)
):
    item = await get_or_404(db, User, item_id, user)
    item.status = payload.status
    item.updated_by = UUID(user["id"])
    await db.flush()
    await db.refresh(item)
    return UserResponse.model_validate(item)


@router.get("/export")
async def export_staff(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    query = select(User).where(User.status != "deleted")
    query = apply_tenant_filter(query, User, user)
    result = await db.execute(query.limit(5000))
    items = result.scalars().all()
    return {"items": [UserResponse.model_validate(i).model_dump() for i in items], "count": len(items)}
