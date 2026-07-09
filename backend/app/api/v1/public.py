from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.core.database import get_db
from app.models import Branch, MenuCategory, MenuItem, Table, TableQrCode, Tenant

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/menu/{branch_id}")
async def public_menu(branch_id: UUID, db: AsyncSession = Depends(get_db)):
    branch = await db.get(Branch, branch_id)
    if not branch or branch.status != "active":
        raise HTTPException(status_code=404, detail="Branch not found")
    cats_result = await db.execute(
        select(MenuCategory).where(
            MenuCategory.branch_id == branch_id,
            MenuCategory.is_active == True,
            MenuCategory.status == "active",
        ).order_by(MenuCategory.sort_order)
    )
    categories = cats_result.scalars().all()
    items_result = await db.execute(
        select(MenuItem).where(
            MenuItem.branch_id == branch_id,
            MenuItem.is_available == True,
            MenuItem.status == "active",
        )
    )
    items = items_result.scalars().all()
    return {
        "branch": {"id": str(branch.id), "name": branch.name, "city": branch.city, "tax_rate": branch.tax_rate},
        "categories": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "image_url": c.image_url,
                "items": [
                    {
                        "id": str(i.id),
                        "name": i.name,
                        "description": i.description,
                        "price": i.price,
                        "image_url": i.image_url,
                        "is_veg": i.is_veg,
                        "prep_time_mins": i.prep_time_mins,
                    }
                    for i in items
                    if i.category_id == c.id
                ],
            }
            for c in categories
        ],
    }


@router.get("/table/{qr_token}")
async def public_table(qr_token: str, db: AsyncSession = Depends(get_db)):
    qr_result = await db.execute(select(TableQrCode).where(TableQrCode.qr_token == qr_token))
    qr = qr_result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    table = await db.get(Table, qr.table_id)
    branch = await db.get(Branch, qr.branch_id)
    return {
        "table": {"id": str(table.id), "number": table.table_number, "capacity": table.capacity},
        "branch": {"id": str(branch.id), "name": branch.name},
        "menu_url": f"/public/menu/{branch.id}",
    }
