from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models import KotTicket, OrderHeader, OrderLine
from app.services.notifications import notify_order_event

router = APIRouter(prefix="/kot", tags=["kot"])

KOT_TO_ORDER_STATUS = {
    "queued": "confirmed",
    "preparing": "preparing",
    "ready": "ready",
    "served": "served",
}


class KotStatusUpdate(BaseModel):
    kot_status: str


@router.get("/queue")
async def kitchen_queue(
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("kitchen_staff", "branch_manager", "restaurant_owner", "super_admin")),
):
    bid = branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    if not bid:
        raise HTTPException(status_code=400, detail="Branch required")
    result = await db.execute(
        select(KotTicket).where(
            KotTicket.branch_id == bid,
            KotTicket.kot_status.notin_(["served", "cancelled"]),
            KotTicket.status != "deleted",
        ).order_by(KotTicket.priority.desc(), KotTicket.fired_at)
    )
    kots = result.scalars().all()
    items = []
    for kot in kots:
        order = await db.get(OrderHeader, kot.order_id)
        lines_result = await db.execute(
            select(OrderLine).where(OrderLine.order_id == kot.order_id, OrderLine.status != "deleted")
        )
        lines = lines_result.scalars().all()
        table_num = None
        if order and order.table_id:
            from app.models import Table
            table = await db.get(Table, order.table_id)
            table_num = table.table_number if table else None
        items.append({
            "id": str(kot.id),
            "kot_number": kot.kot_number,
            "kot_status": kot.kot_status,
            "kitchen_station": kot.kitchen_station,
            "priority": kot.priority,
            "fired_at": kot.fired_at.isoformat() if kot.fired_at else None,
            "order_id": str(kot.order_id),
            "order_number": order.order_number if order else None,
            "order_type": order.order_type if order else None,
            "table_number": table_num,
            "lines": [{"item_name": l.item_name, "quantity": l.quantity, "line_status": l.line_status, "notes": l.notes} for l in lines],
        })
    return {"items": items}


@router.patch("/advance/{kot_id}")
async def advance_kot(
    kot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("kitchen_staff", "branch_manager")),
):
    kot = await db.get(KotTicket, kot_id)
    if not kot:
        raise HTTPException(status_code=404, detail="KOT not found")
    flow = ["queued", "preparing", "ready", "served"]
    idx = flow.index(kot.kot_status) if kot.kot_status in flow else 0
    next_status = flow[min(idx + 1, len(flow) - 1)]
    kot.kot_status = next_status
    kot.updated_by = UUID(user["id"])
    if next_status == "served":
        kot.completed_at = datetime.now(timezone.utc)

    order = await db.get(OrderHeader, kot.order_id)
    if order:
        order.order_status = KOT_TO_ORDER_STATUS.get(next_status, order.order_status)
        order.updated_by = UUID(user["id"])
        lines_result = await db.execute(select(OrderLine).where(OrderLine.order_id == order.id))
        for line in lines_result.scalars().all():
            if next_status == "preparing":
                line.line_status = "preparing"
            elif next_status == "ready":
                line.line_status = "ready"
            elif next_status == "served":
                line.line_status = "served"

    await db.flush()

    if order:
        status_messages = {
            "preparing": ("Order in preparation", f"{order.order_number} is being prepared in the kitchen"),
            "ready": ("Order ready to serve", f"{order.order_number} is ready — please serve the guest"),
            "served": ("Order served", f"{order.order_number} has been served"),
        }
        if next_status in status_messages:
            title, msg = status_messages[next_status]
            await notify_order_event(
                db, order=order, event_type=next_status, title=title, message=msg,
            )

    return {
        "id": str(kot.id),
        "kot_status": kot.kot_status,
        "order_status": order.order_status if order else None,
        "message": f"KOT marked as {next_status}",
    }
