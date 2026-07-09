from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.core.database import get_db
from app.models import Branch, KotTicket, MenuCategory, MenuItem, OrderHeader, OrderLine, Table, TableQrCode, Tenant

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
        "branch": {
            "id": str(branch.id), "name": branch.name, "city": branch.city,
            "tax_rate": branch.tax_rate,
            "cgst_rate": branch.tax_rate / 2,
            "sgst_rate": branch.tax_rate / 2,
            "service_charge_rate": getattr(branch, "service_charge_rate", 0) or 0,
        },
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
        "branch": {"id": str(branch.id), "name": branch.name, "tax_rate": branch.tax_rate},
        "menu_url": f"/public/menu/{branch.id}",
        "order_path": qr.qr_url,
    }


class PublicQROrder(BaseModel):
    qr_token: str
    lines: list[dict]
    guest_name: str | None = None
    coupon_code: str | None = None


@router.post("/qr-order")
async def public_qr_order(payload: PublicQROrder, db: AsyncSession = Depends(get_db)):
    qr_result = await db.execute(select(TableQrCode).where(TableQrCode.qr_token == payload.qr_token))
    qr = qr_result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    table = await db.get(Table, qr.table_id)
    branch = await db.get(Branch, qr.branch_id)
    from app.services.billing import LineInput, apply_bill_to_order, calculate_bill
    from datetime import datetime, timezone
    line_inputs = [LineInput(menu_item_id=UUID(l["menu_item_id"]), quantity=l.get("quantity", 1)) for l in payload.lines]
    bill = await calculate_bill(db, branch, line_inputs, payload.coupon_code, restaurant_id=branch.restaurant_id)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = len((await db.execute(select(OrderHeader).where(OrderHeader.branch_id == branch.id))).scalars().all())
    order = OrderHeader(
        restaurant_id=branch.restaurant_id,
        branch_id=branch.id,
        order_number=f"ORD-{today}-{count + 1:04d}",
        order_type="dine_in",
        table_id=table.id,
        order_status="placed",
        payment_status="unpaid",
        notes=payload.guest_name or "QR guest order",
        coupon_code=bill.coupon_code,
    )
    apply_bill_to_order(order, bill)
    db.add(order)
    await db.flush()
    for line in payload.lines:
        item = await db.get(MenuItem, UUID(line["menu_item_id"]))
        if item:
            db.add(OrderLine(
                restaurant_id=branch.restaurant_id, branch_id=branch.id, order_id=order.id,
                menu_item_id=item.id, item_name=item.name, quantity=line.get("quantity", 1),
                unit_price=item.price, line_total=item.price * line.get("quantity", 1), line_status="placed",
            ))
    if table:
        table.table_status = "occupied"
    db.add(KotTicket(
        restaurant_id=branch.restaurant_id, branch_id=branch.id, order_id=order.id,
        kot_number=f"KOT-{order.order_number.split('-')[-1]}", kitchen_station="main", kot_status="queued",
    ))
    order.order_status = "confirmed"
    await db.flush()
    return {"id": str(order.id), "order_number": order.order_number, "net_amount": order.net_amount, "message": "QR order sent to kitchen"}
