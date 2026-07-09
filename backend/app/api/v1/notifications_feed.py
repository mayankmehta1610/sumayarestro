from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkReadPayload(BaseModel):
    notification_ids: list[UUID] | None = None


@router.get("/mine")
async def my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    uid = UUID(user["id"])
    query = select(Notification).where(
        Notification.status != "deleted",
        or_(Notification.user_id == uid, Notification.user_id.is_(None)),
    )
    if user.get("restaurant_id"):
        query = query.where(
            or_(
                Notification.restaurant_id == UUID(user["restaurant_id"]),
                Notification.restaurant_id.is_(None),
            )
        )
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "event_type": n.event_type,
                "reference_id": str(n.reference_id) if n.reference_id else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ]
    }


@router.get("/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    uid = UUID(user["id"])
    count = (
        await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == uid,
                Notification.is_read.is_(False),
                Notification.status != "deleted",
            )
        )
    ).scalar() or 0
    return {"count": count}


@router.patch("/mark-read")
async def mark_read(
    payload: MarkReadPayload,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    uid = UUID(user["id"])
    if payload.notification_ids:
        await db.execute(
            update(Notification)
            .where(Notification.id.in_(payload.notification_ids), Notification.user_id == uid)
            .values(is_read=True)
        )
    else:
        await db.execute(
            update(Notification).where(Notification.user_id == uid).values(is_read=True)
        )
    await db.flush()
    return {"message": "Marked as read"}
