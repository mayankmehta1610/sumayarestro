from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Ingredient, MenuItem, OrderHeader, OrderLine, StockLedger
from app.schemas.common import apply_tenant_filter

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/forecast")
async def demand_forecast(
    branch_id: UUID | None = None,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    query = select(OrderLine.item_name, func.sum(OrderLine.quantity).label("qty")).join(
        OrderHeader, OrderLine.order_id == OrderHeader.id
    ).where(OrderHeader.created_at >= since, OrderHeader.status != "deleted")
    if branch_id:
        query = query.where(OrderHeader.branch_id == branch_id)
    query = apply_tenant_filter(query, OrderHeader, user)
    query = query.group_by(OrderLine.item_name).order_by(func.sum(OrderLine.quantity).desc()).limit(20)
    result = await db.execute(query)
    rows = result.all()
    forecast = []
    for name, qty in rows:
        daily_avg = float(qty) / 30
        forecast.append({
            "item_name": name,
            "historical_30d_qty": int(qty),
            "daily_avg": round(daily_avg, 1),
            "forecast_next_7d": round(daily_avg * days, 0),
            "recommendation": "Increase prep" if daily_avg > 5 else "Normal stock",
        })
    return {"days": days, "items": forecast}


@router.get("/recommendations")
async def menu_recommendations(
    customer_id: UUID | None = None,
    branch_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = select(OrderLine.item_name, func.count().label("cnt")).join(
        OrderHeader, OrderLine.order_id == OrderHeader.id
    ).where(OrderHeader.status != "deleted")
    if branch_id:
        query = query.where(OrderHeader.branch_id == branch_id)
    query = apply_tenant_filter(query, OrderHeader, user)
    query = query.group_by(OrderLine.item_name).order_by(func.count().desc()).limit(10)
    popular = (await db.execute(query)).all()

    low_stock = []
    inv_q = select(Ingredient).where(Ingredient.current_stock <= Ingredient.reorder_level)
    inv_q = apply_tenant_filter(inv_q, Ingredient, user)
    for ing in (await db.execute(inv_q.limit(10))).scalars().all():
        low_stock.append({"ingredient": ing.name, "current_stock": ing.current_stock, "reorder_level": ing.reorder_level, "action": f"Reorder {ing.reorder_level - ing.current_stock:.0f} {ing.unit}"})

    upsell = [{"item_name": name, "reason": "Popular with guests"} for name, _ in popular[:5]]
    return {"popular_items": [{"item_name": n, "order_count": c} for n, c in popular], "upsell_suggestions": upsell, "inventory_alerts": low_stock}


@router.get("/reorder-suggestions")
async def reorder_suggestions(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    query = select(Ingredient).where(Ingredient.current_stock <= Ingredient.reorder_level)
    query = apply_tenant_filter(query, Ingredient, user)
    items = (await db.execute(query)).scalars().all()
    return {"items": [{"name": i.name, "current": i.current_stock, "reorder": i.reorder_level, "order_qty": max(i.reorder_level * 2 - i.current_stock, i.reorder_level)} for i in items]}
