from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.rbac import can_access
from app.models import OrderHeader, OrderLine, Table
from app.schemas.common import apply_tenant_filter

router = APIRouter(prefix="/tables", tags=["tables"])


def _resolve_branch(user: dict, branch_id: UUID | None) -> UUID:
    if branch_id:
        return branch_id
    if user.get("branch_id"):
        return UUID(user["branch_id"])
    raise HTTPException(status_code=400, detail="Branch selection required")


@router.get("/floor")
async def floor_plan(
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] not in ("waiter", "cashier", "branch_manager", "restaurant_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    bid = _resolve_branch(user, branch_id)
    result = await db.execute(
        select(Table).where(Table.branch_id == bid, Table.status != "deleted").order_by(Table.table_number)
    )
    tables = result.scalars().all()
    items = []
    for t in tables:
        active_order = None
        if t.table_status == "occupied":
            order_result = await db.execute(
                select(OrderHeader).where(
                    OrderHeader.table_id == t.id,
                    OrderHeader.order_status.notin_(["completed", "cancelled"]),
                    OrderHeader.status != "deleted",
                ).order_by(OrderHeader.created_at.desc()).limit(1)
            )
            order = order_result.scalar_one_or_none()
            if order:
                lines_result = await db.execute(
                    select(OrderLine).where(OrderLine.order_id == order.id, OrderLine.status != "deleted")
                )
                active_order = {
                    "id": str(order.id),
                    "order_number": order.order_number,
                    "order_status": order.order_status,
                    "net_amount": order.net_amount,
                    "payment_status": order.payment_status,
                    "item_count": len(lines_result.scalars().all()),
                }
        items.append({
            "id": str(t.id),
            "table_number": t.table_number,
            "capacity": t.capacity,
            "table_status": t.table_status,
            "floor_id": str(t.floor_id) if t.floor_id else None,
            "active_order": active_order,
        })
    return {"items": items, "branch_id": str(bid)}


@router.patch("/{table_id}/free")
async def mark_table_free(
    table_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("waiter", "cashier", "branch_manager", "restaurant_owner", "super_admin")),
):
    table = await db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    open_orders = await db.execute(
        select(OrderHeader).where(
            OrderHeader.table_id == table_id,
            OrderHeader.order_status.notin_(["completed", "cancelled"]),
            OrderHeader.status != "deleted",
        )
    )
    for order in open_orders.scalars().all():
        order.order_status = "completed"
        order.payment_status = order.payment_status if order.payment_status == "paid" else "unpaid"
        order.updated_by = UUID(user["id"])
    table.table_status = "available"
    table.updated_by = UUID(user["id"])
    table.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return {"id": str(table.id), "table_number": table.table_number, "table_status": "available", "message": "Table marked free"}


@router.patch("/{table_id}/occupy")
async def mark_table_occupied(
    table_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("waiter", "cashier", "branch_manager")),
):
    table = await db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.table_status == "occupied":
        raise HTTPException(status_code=400, detail="Table already occupied")
    table.table_status = "occupied"
    table.updated_by = UUID(user["id"])
    await db.flush()
    return {"id": str(table.id), "table_status": "occupied"}
