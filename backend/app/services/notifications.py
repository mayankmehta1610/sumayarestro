"""Event-driven in-app notifications."""
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, User


async def notify_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    title: str,
    message: str,
    restaurant_id: UUID | None = None,
    branch_id: UUID | None = None,
    event_type: str | None = None,
    reference_id: UUID | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        channel="in_app",
        restaurant_id=restaurant_id,
        branch_id=branch_id,
        event_type=event_type,
        reference_id=reference_id,
    )
    db.add(n)
    await db.flush()
    return n


async def notify_role(
    db: AsyncSession,
    *,
    role: str,
    title: str,
    message: str,
    restaurant_id: UUID,
    branch_id: UUID | None = None,
    event_type: str | None = None,
    reference_id: UUID | None = None,
) -> list[Notification]:
    query = select(User).where(
        User.role == role,
        User.restaurant_id == restaurant_id,
        User.is_active.is_(True),
        User.status != "deleted",
    )
    if branch_id:
        query = query.where(or_(User.branch_id == branch_id, User.branch_id.is_(None)))
    result = await db.execute(query)
    users = result.scalars().all()
    created: list[Notification] = []
    for u in users:
        created.append(
            await notify_user(
                db,
                user_id=u.id,
                title=title,
                message=message,
                restaurant_id=restaurant_id,
                branch_id=branch_id,
                event_type=event_type,
                reference_id=reference_id,
            )
        )
    return created


async def notify_order_event(
    db: AsyncSession,
    *,
    order,
    event_type: str,
    title: str,
    message: str,
    extra_user_ids: list[UUID] | None = None,
) -> None:
    """Notify kitchen/waiter/customer based on order lifecycle."""
    role_map = {
        "order_placed": "kitchen_staff",
        "preparing": "kitchen_staff",
        "ready": "waiter",
        "served": "waiter",
        "completed": "cashier",
        "delivered": "delivery_operator",
    }
    role = role_map.get(event_type)
    if role:
        await notify_role(
            db,
            role=role,
            title=title,
            message=message,
            restaurant_id=order.restaurant_id,
            branch_id=order.branch_id,
            event_type=event_type,
            reference_id=order.id,
        )
    if order.waiter_id:
        await notify_user(
            db,
            user_id=order.waiter_id,
            title=title,
            message=message,
            restaurant_id=order.restaurant_id,
            branch_id=order.branch_id,
            event_type=event_type,
            reference_id=order.id,
        )
    if order.customer_id:
        cust_users = await db.execute(
            select(User).where(User.role == "customer", User.restaurant_id == order.restaurant_id)
        )
        for u in cust_users.scalars().all():
            await notify_user(
                db,
                user_id=u.id,
                title=title,
                message=message,
                restaurant_id=order.restaurant_id,
                branch_id=order.branch_id,
                event_type=event_type,
                reference_id=order.id,
            )
    for uid in extra_user_ids or []:
        await notify_user(
            db,
            user_id=uid,
            title=title,
            message=message,
            restaurant_id=order.restaurant_id,
            branch_id=order.branch_id,
            event_type=event_type,
            reference_id=order.id,
        )
