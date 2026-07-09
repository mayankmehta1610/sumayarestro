from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models import Customer, Table, User, WaitlistEntry
from app.services.notifications import notify_role, notify_user

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


class JoinWaitlistPayload(BaseModel):
    guest_name: str
    guest_phone: str | None = None
    party_size: int = 2
    notes: str | None = None
    branch_id: UUID | None = None


class SeatGuestPayload(BaseModel):
    table_id: UUID


@router.get("/queue")
async def get_queue(
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    bid = branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    if not bid:
        raise HTTPException(status_code=400, detail="Branch required")
    result = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.branch_id == bid,
            WaitlistEntry.waitlist_status.in_(["waiting", "called"]),
            WaitlistEntry.status != "deleted",
        ).order_by(WaitlistEntry.queue_number)
    )
    entries = result.scalars().all()
    return {
        "items": [
            {
                "id": str(e.id),
                "queue_number": e.queue_number,
                "guest_name": e.guest_name,
                "guest_phone": e.guest_phone,
                "party_size": e.party_size,
                "waitlist_status": e.waitlist_status,
                "estimated_wait_mins": e.estimated_wait_mins,
                "called_at": e.called_at.isoformat() if e.called_at else None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }


@router.post("/join")
async def join_waitlist(
    payload: JoinWaitlistPayload,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    bid = payload.branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    if not bid:
        raise HTTPException(status_code=400, detail="Branch required")
    rid = UUID(user["restaurant_id"]) if user.get("restaurant_id") else None
    if not rid:
        raise HTTPException(status_code=400, detail="Restaurant required")

    max_num = (
        await db.execute(
            select(func.max(WaitlistEntry.queue_number)).where(
                WaitlistEntry.branch_id == bid,
                func.date(WaitlistEntry.created_at) == func.current_date(),
            )
        )
    ).scalar() or 0

    customer_id = None
    if user.get("role") == "customer":
        cust = await db.execute(select(Customer).where(Customer.email == user.get("email")))
        c = cust.scalar_one_or_none()
        customer_id = c.id if c else None

    entry = WaitlistEntry(
        restaurant_id=rid,
        branch_id=bid,
        customer_id=customer_id,
        guest_name=payload.guest_name,
        guest_phone=payload.guest_phone,
        party_size=payload.party_size,
        queue_number=max_num + 1,
        waitlist_status="waiting",
        estimated_wait_mins=15 + max_num * 5,
        notes=payload.notes,
        created_by=UUID(user["id"]),
    )
    db.add(entry)
    await db.flush()

    await notify_role(
        db,
        role="waiter",
        title="New guest in waitlist",
        message=f"#{entry.queue_number} {entry.guest_name} — party of {entry.party_size}",
        restaurant_id=rid,
        branch_id=bid,
        event_type="waitlist_joined",
        reference_id=entry.id,
    )
    await notify_role(
        db,
        role="branch_manager",
        title="Waitlist updated",
        message=f"Queue #{entry.queue_number} joined",
        restaurant_id=rid,
        branch_id=bid,
        event_type="waitlist_joined",
        reference_id=entry.id,
    )

    return {
        "id": str(entry.id),
        "queue_number": entry.queue_number,
        "estimated_wait_mins": entry.estimated_wait_mins,
        "message": f"You are #{entry.queue_number} in the queue",
    }


@router.patch("/call-next")
async def call_next(
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("waiter", "branch_manager", "restaurant_owner")),
):
    bid = branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    if not bid:
        raise HTTPException(status_code=400, detail="Branch required")

    result = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.branch_id == bid,
            WaitlistEntry.waitlist_status == "waiting",
            WaitlistEntry.status != "deleted",
        ).order_by(WaitlistEntry.queue_number).limit(1)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="No guests waiting")

    entry.waitlist_status = "called"
    entry.called_at = datetime.now(timezone.utc)
    entry.updated_by = UUID(user["id"])
    await db.flush()

    if entry.customer_id:
        cust_user = await db.execute(
            select(User).where(User.role == "customer", User.restaurant_id == entry.restaurant_id)
        )
        for u in cust_user.scalars().all():
            await notify_user(
                db,
                user_id=u.id,
                title="Your table is ready!",
                message=f"Queue #{entry.queue_number} — please proceed to the host stand.",
                restaurant_id=entry.restaurant_id,
                branch_id=entry.branch_id,
                event_type="waitlist_called",
                reference_id=entry.id,
            )

    return {
        "id": str(entry.id),
        "queue_number": entry.queue_number,
        "guest_name": entry.guest_name,
        "party_size": entry.party_size,
        "message": f"Called #{entry.queue_number} — {entry.guest_name}",
    }


@router.patch("/{entry_id}/seat")
async def seat_guest(
    entry_id: UUID,
    payload: SeatGuestPayload,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("waiter", "branch_manager")),
):
    entry = await db.get(WaitlistEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    table = await db.get(Table, payload.table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.table_status not in ("available", "reserved"):
        raise HTTPException(status_code=400, detail="Table not available")

    entry.waitlist_status = "seated"
    entry.table_id = payload.table_id
    entry.seated_at = datetime.now(timezone.utc)
    entry.updated_by = UUID(user["id"])
    table.table_status = "occupied"
    await db.flush()

    return {
        "id": str(entry.id),
        "queue_number": entry.queue_number,
        "table_id": str(payload.table_id),
        "table_number": table.table_number,
        "message": f"Seated #{entry.queue_number} at table {table.table_number}",
    }


@router.patch("/{entry_id}/cancel")
async def cancel_waitlist(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    entry = await db.get(WaitlistEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.waitlist_status = "cancelled"
    entry.updated_by = UUID(user["id"])
    await db.flush()
    return {"message": "Removed from waitlist"}


@router.get("/status/{queue_number}")
async def check_status(
    queue_number: int,
    branch_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.branch_id == branch_id,
            WaitlistEntry.queue_number == queue_number,
            WaitlistEntry.status != "deleted",
        ).order_by(WaitlistEntry.created_at.desc()).limit(1)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue number not found")
    ahead = (
        await db.execute(
            select(func.count()).select_from(WaitlistEntry).where(
                WaitlistEntry.branch_id == branch_id,
                WaitlistEntry.waitlist_status == "waiting",
                WaitlistEntry.queue_number < entry.queue_number,
            )
        )
    ).scalar() or 0
    return {
        "queue_number": entry.queue_number,
        "guest_name": entry.guest_name,
        "waitlist_status": entry.waitlist_status,
        "party_size": entry.party_size,
        "parties_ahead": ahead,
        "estimated_wait_mins": entry.estimated_wait_mins,
        "called_at": entry.called_at.isoformat() if entry.called_at else None,
    }
