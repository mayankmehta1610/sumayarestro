import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Branch, Coupon, KotTicket, MenuItem, OrderHeader, OrderLine, Table
from app.schemas.common import apply_tenant_filter, get_or_404, paginate
from app.schemas.entities import OrderCreate, OrderResponse, OrderUpdate, OrderLineResponse
from app.services.notifications import notify_order_event

router = APIRouter(prefix="/orders", tags=["orders"])


async def _generate_order_number(db: AsyncSession, branch_id: UUID) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = (
        await db.execute(
            select(func.count()).select_from(OrderHeader).where(
                OrderHeader.branch_id == branch_id,
                func.date(OrderHeader.created_at) == func.current_date(),
            )
        )
    ).scalar() or 0
    return f"ORD-{today}-{count + 1:04d}"


@router.get("/list")
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = select(OrderHeader).where(OrderHeader.status != "deleted")
    query = apply_tenant_filter(query, OrderHeader, user)
    if order_status:
        query = query.where(OrderHeader.order_status == order_status)
    query = query.order_by(OrderHeader.created_at.desc())
    data = await paginate(db, query, page, page_size)
    items = []
    for order in data["items"]:
        lines_result = await db.execute(
            select(OrderLine).where(OrderLine.order_id == order.id, OrderLine.status != "deleted")
        )
        lines = lines_result.scalars().all()
        resp = OrderResponse.model_validate(order)
        resp.lines = [OrderLineResponse.model_validate(l) for l in lines]
        items.append(resp)
    data["items"] = items
    return data


@router.post("/create", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    branch_id = UUID(user["branch_id"]) if user.get("branch_id") else None
    if not branch_id and hasattr(payload, "branch_id") and getattr(payload, "branch_id", None):
        branch_id = payload.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch context required. Select a branch first.")
    branch = await db.get(Branch, branch_id)
    tax_rate = branch.tax_rate if branch else 5.0

    gross = 0.0
    lines_data = []
    for line in payload.lines:
        item = await db.get(MenuItem, line.menu_item_id)
        if not item or not item.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item unavailable: {line.menu_item_id}")
        line_total = item.price * line.quantity
        gross += line_total
        lines_data.append((item, line, line_total))

    discount = 0.0
    if payload.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(
                Coupon.code == payload.coupon_code,
                Coupon.status == "active",
            )
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            if coupon.discount_type == "percent":
                discount = gross * (coupon.discount_value / 100)
            else:
                discount = coupon.discount_value
            coupon.used_count += 1

    taxable = gross - discount
    tax = taxable * (tax_rate / 100)
    net = taxable + tax

    order = OrderHeader(
        restaurant_id=UUID(user["restaurant_id"]) if user.get("restaurant_id") else item.restaurant_id,
        branch_id=branch_id,
        order_number=await _generate_order_number(db, branch_id),
        order_type=payload.order_type,
        table_id=payload.table_id,
        customer_id=payload.customer_id,
        waiter_id=UUID(user["id"]) if user.get("role") in ("waiter", "cashier", "branch_manager") else None,
        order_status="placed",
        gross_amount=gross,
        discount_amount=discount,
        tax_amount=tax,
        net_amount=net,
        payment_status="unpaid",
        coupon_code=payload.coupon_code,
        notes=payload.notes,
        created_by=UUID(user["id"]),
    )
    db.add(order)
    await db.flush()

    order_lines = []
    for item, line_input, line_total in lines_data:
        ol = OrderLine(
            restaurant_id=order.restaurant_id,
            branch_id=branch_id,
            order_id=order.id,
            menu_item_id=item.id,
            item_name=item.name,
            quantity=line_input.quantity,
            unit_price=item.price,
            line_total=line_total,
            modifiers=line_input.modifiers,
            notes=line_input.notes,
            created_by=UUID(user["id"]),
        )
        db.add(ol)
        order_lines.append(ol)

    if payload.table_id:
        table = await db.get(Table, payload.table_id)
        if table:
            table.table_status = "occupied"

    await db.flush()

    kot_number = f"KOT-{order.order_number.split('-')[-1]}"
    kot = KotTicket(
        restaurant_id=order.restaurant_id,
        branch_id=branch_id,
        order_id=order.id,
        kot_number=kot_number,
        kitchen_station="main",
        kot_status="queued",
        created_by=UUID(user["id"]),
    )
    db.add(kot)
    order.order_status = "confirmed"
    await db.flush()

    await notify_order_event(
        db,
        order=order,
        event_type="order_placed",
        title="New order received",
        message=f"{order.order_number} placed — {len(order_lines)} items sent to kitchen",
    )

    await db.refresh(order)

    resp = OrderResponse.model_validate(order)
    resp.lines = [OrderLineResponse.model_validate(l) for l in order_lines]
    return resp


@router.get("/detail/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await get_or_404(db, OrderHeader, order_id, user)
    lines_result = await db.execute(
        select(OrderLine).where(OrderLine.order_id == order.id, OrderLine.status != "deleted")
    )
    lines = lines_result.scalars().all()
    resp = OrderResponse.model_validate(order)
    resp.lines = [OrderLineResponse.model_validate(l) for l in lines]
    return resp


@router.patch("/update/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: UUID,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await get_or_404(db, OrderHeader, order_id, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, key, value)
    if payload.order_status == "completed" and order.table_id:
        table = await db.get(Table, order.table_id)
        if table:
            table.table_status = "available"
    order.updated_by = UUID(user["id"])
    await db.flush()
    await db.refresh(order)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
    resp = OrderResponse.model_validate(order)
    resp.lines = [OrderLineResponse.model_validate(l) for l in lines_result.scalars().all()]
    return resp


@router.patch("/status/{order_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await get_or_404(db, OrderHeader, order_id, user)
    old_status = order.order_status
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, key, value)
    if payload.order_status == "completed" and order.table_id:
        table = await db.get(Table, order.table_id)
        if table:
            table.table_status = "available"
    order.updated_by = UUID(user["id"])
    await db.flush()

    if payload.order_status and payload.order_status != old_status:
        labels = {
            "confirmed": "Order confirmed",
            "preparing": "In preparation",
            "ready": "Ready for serving",
            "served": "Served",
            "completed": "Order completed",
            "cancelled": "Order cancelled",
        }
        await notify_order_event(
            db,
            order=order,
            event_type=payload.order_status,
            title=labels.get(payload.order_status, "Order updated"),
            message=f"{order.order_number} is now {payload.order_status.replace('_', ' ')}",
        )

    await db.refresh(order)
    lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
    resp = OrderResponse.model_validate(order)
    resp.lines = [OrderLineResponse.model_validate(l) for l in lines_result.scalars().all()]
    return resp


@router.get("/track/{order_id}")
async def track_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    from app.api.v1.customer import track_order as customer_track
    return await customer_track(order_id, db, user)


@router.get("/export")
async def export_orders(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    query = select(OrderHeader).where(OrderHeader.status != "deleted")
    query = apply_tenant_filter(query, OrderHeader, user)
    result = await db.execute(query.order_by(OrderHeader.created_at.desc()).limit(5000))
    orders = result.scalars().all()
    return {
        "items": [OrderResponse.model_validate(o).model_dump() for o in orders],
        "count": len(orders),
    }
