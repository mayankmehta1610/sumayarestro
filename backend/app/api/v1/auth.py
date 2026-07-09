from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pydantic import BaseModel, EmailStr

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rbac import get_modules_for_role
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Branch, Restaurant, Tenant, User
from app.schemas.entities import LoginRequest, RegisterRequest, TokenResponse


class SetBranchRequest(BaseModel):
    branch_id: UUID


class RestaurantLoginRequest(BaseModel):
    email: EmailStr
    password: str
    restaurant_slug: str | None = None

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.role != "customer"))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.last_login = datetime.now(timezone.utc)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    branches = await _get_user_branches(db, user)
    restaurant_slug = None
    if user.restaurant_id:
        rest = await db.get(Restaurant, user.restaurant_id)
        restaurant_slug = rest.slug if rest else None
    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "restaurant_slug": restaurant_slug,
            "modules": get_modules_for_role(user.role),
            "branches": branches,
            "needs_branch_selection": len(branches) > 1 and not user.branch_id and user.role in ("restaurant_owner", "super_admin"),
        },
    )


@router.post("/restaurant-login", response_model=TokenResponse)
async def restaurant_login(payload: RestaurantLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.role != "customer"))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if payload.restaurant_slug and user.restaurant_id:
        rest_result = await db.execute(select(Restaurant).where(Restaurant.slug == payload.restaurant_slug))
        rest = rest_result.scalar_one_or_none()
        if not rest or str(rest.id) != str(user.restaurant_id):
            if user.role != "super_admin":
                raise HTTPException(status_code=403, detail="Not authorized for this restaurant")
    user.last_login = datetime.now(timezone.utc)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    branches = await _get_user_branches(db, user)
    restaurant_slug = payload.restaurant_slug
    if not restaurant_slug and user.restaurant_id:
        rest = await db.get(Restaurant, user.restaurant_id)
        restaurant_slug = rest.slug if rest else None
    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "restaurant_slug": restaurant_slug,
            "modules": get_modules_for_role(user.role),
            "branches": branches,
            "needs_branch_selection": len(branches) > 1 and not user.branch_id and user.role in ("restaurant_owner",),
        },
    )


async def _get_user_branches(db: AsyncSession, user: User) -> list[dict]:
    if user.role == "super_admin":
        result = await db.execute(select(Branch).where(Branch.status == "active").limit(50))
    elif user.restaurant_id:
        result = await db.execute(
            select(Branch).where(Branch.restaurant_id == user.restaurant_id, Branch.status == "active")
        )
    else:
        return []
    return [{"id": str(b.id), "name": b.name, "city": b.city, "code": b.code} for b in result.scalars().all()]


@router.post("/set-branch")
async def set_branch(
    payload: SetBranchRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    branch = await db.get(Branch, payload.branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    if user["restaurant_id"] and str(branch.restaurant_id) != user["restaurant_id"] and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Branch not in your restaurant")
    db_user = await db.get(User, UUID(user["id"]))
    db_user.branch_id = payload.branch_id
    await db.flush()
    return {"branch_id": str(payload.branch_id), "branch_name": branch.name, "message": "Branch selected"}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        restaurant_id=payload.restaurant_id,
        branch_id=payload.branch_id,
    )
    db.add(user)
    await db.flush()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
            "branch_id": str(user.branch_id) if user.branch_id else None,
        },
    )


@router.get("/me")
async def me(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    db_user = await db.get(User, UUID(user["id"]))
    branches = await _get_user_branches(db, db_user) if db_user else []
    restaurant_slug = None
    if user.get("restaurant_id"):
        rest = await db.get(Restaurant, UUID(user["restaurant_id"]))
        restaurant_slug = rest.slug if rest else None
    return {
        **user,
        "restaurant_slug": restaurant_slug,
        "modules": get_modules_for_role(user["role"]),
        "branches": branches,
        "needs_branch_selection": len(branches) > 1 and not user.get("branch_id") and user["role"] in ("restaurant_owner",),
    }


@router.get("/public/restaurant/{slug}")
async def get_public_restaurant(slug: str, db: AsyncSession = Depends(get_db)):
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug, Tenant.status == "active"))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    rest_result = await db.execute(
        select(Restaurant).where(Restaurant.slug == slug, Restaurant.status == "active")
    )
    restaurant = rest_result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    branches_result = await db.execute(
        select(Branch).where(Branch.restaurant_id == restaurant.id, Branch.status == "active")
    )
    branches = branches_result.scalars().all()
    return {
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "brand_style": tenant.brand_style,
            "primary_color": tenant.primary_color,
            "secondary_color": tenant.secondary_color,
            "logo_url": tenant.logo_url,
        },
        "restaurant": {
            "id": str(restaurant.id),
            "name": restaurant.name,
            "description": restaurant.description,
            "cuisine_type": restaurant.cuisine_type,
        },
        "branches": [
            {
                "id": str(b.id),
                "name": b.name,
                "city": b.city,
                "address": b.address,
                "delivery_enabled": b.delivery_enabled,
            }
            for b in branches
        ],
    }
