from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models import Branch, Reservation, Table
from app.services.notifications import notify_role, notify_user

router = APIRouter(prefix="/reservations", tags=["reservations-flow"])


class BookReservationPayload(BaseModel):
    guest_name: str
    guest_phone: str | None = None
    guest_count: int = 2
    reserved_at: datetime
    event_type: str | None = None
    notes: str | None = None
    table_id: UUID | None = None
    branch_id: UUID | None = None


@router.post("/book-public")
async def book_public(
    payload: BookReservationPayload,
    db: AsyncSession = Depends(get_db),
):
    """Public table booking — no login required."""
    if not payload.branch_id:
        raise HTTPException(status_code=400, detail="branch_id required")
    branch = await db.get(Branch, payload.branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    reservation = Reservation(
        restaurant_id=branch.restaurant_id,
        branch_id=payload.branch_id,
        guest_name=payload.guest_name,
        guest_phone=payload.guest_phone,
        guest_count=payload.guest_count,
        reserved_at=payload.reserved_at,
        event_type=payload.event_type,
        notes=payload.notes,
        reservation_status="confirmed",
    )
    db.add(reservation)
    await db.flush()

    await notify_role(
        db,
        role="waiter",
        title="New table reservation",
        message=f"{payload.guest_name} — {payload.guest_count} guests at {payload.reserved_at.strftime('%d %b %H:%M')}",
        restaurant_id=branch.restaurant_id,
        branch_id=payload.branch_id,
        event_type="reservation_booked",
        reference_id=reservation.id,
    )

    return {
        "id": str(reservation.id),
        "message": "Table reserved successfully! We will confirm shortly.",
        "reservation_status": reservation.reservation_status,
    }


@router.post("/book")
async def book_reservation(
    payload: BookReservationPayload,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    bid = payload.branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    rid = UUID(user["restaurant_id"]) if user.get("restaurant_id") else None
    if not bid or not rid:
        raise HTTPException(status_code=400, detail="Branch and restaurant required")

    reservation = Reservation(
        restaurant_id=rid,
        branch_id=bid,
        guest_name=payload.guest_name,
        guest_phone=payload.guest_phone,
        guest_count=payload.guest_count,
        reserved_at=payload.reserved_at,
        event_type=payload.event_type,
        notes=payload.notes,
        table_id=payload.table_id,
        reservation_status="confirmed",
        created_by=UUID(user["id"]),
    )
    db.add(reservation)
    if payload.table_id:
        table = await db.get(Table, payload.table_id)
        if table:
            table.table_status = "reserved"
    await db.flush()

    await notify_role(
        db,
        role="waiter",
        title="New reservation",
        message=f"{payload.guest_name} — {payload.guest_count} guests at {payload.reserved_at.strftime('%d %b %H:%M')}",
        restaurant_id=rid,
        branch_id=bid,
        event_type="reservation_booked",
        reference_id=reservation.id,
    )

    return {
        "id": str(reservation.id),
        "guest_name": reservation.guest_name,
        "reserved_at": reservation.reserved_at.isoformat(),
        "reservation_status": reservation.reservation_status,
        "message": "Reservation confirmed",
    }


@router.patch("/{reservation_id}/check-in")
async def check_in(
    reservation_id: UUID,
    table_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles("waiter", "branch_manager", "restaurant_owner")),
):
    res = await db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    res.reservation_status = "seated"
    if table_id:
        res.table_id = table_id
        table = await db.get(Table, table_id)
        if table:
            table.table_status = "occupied"
    res.updated_by = UUID(user["id"])
    await db.flush()
    return {"id": str(res.id), "reservation_status": res.reservation_status, "message": "Guest checked in"}


@router.patch("/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    res = await db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    res.reservation_status = "cancelled"
    if res.table_id:
        table = await db.get(Table, res.table_id)
        if table and table.table_status == "reserved":
            table.table_status = "available"
    res.updated_by = UUID(user["id"])
    await db.flush()
    return {"message": "Reservation cancelled"}


@router.get("/today")
async def today_reservations(
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    bid = branch_id or (UUID(user["branch_id"]) if user.get("branch_id") else None)
    if not bid:
        raise HTTPException(status_code=400, detail="Branch required")
    result = await db.execute(
        select(Reservation).where(
            Reservation.branch_id == bid,
            Reservation.status != "deleted",
            Reservation.reservation_status.in_(["confirmed", "seated", "pending"]),
        ).order_by(Reservation.reserved_at)
    )
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "guest_name": r.guest_name,
                "guest_phone": r.guest_phone,
                "guest_count": r.guest_count,
                "reserved_at": r.reserved_at.isoformat(),
                "reservation_status": r.reservation_status,
                "event_type": r.event_type,
                "table_id": str(r.table_id) if r.table_id else None,
            }
            for r in items
        ]
    }
