from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Branch, Ingredient, KotTicket, MenuItem, OrderHeader, OrderLine, Payment, Restaurant, Table, Tenant, TenantInvoice
from app.schemas.common import apply_tenant_filter
from app.schemas.entities import DashboardStats

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    sales_query = select(func.coalesce(func.sum(OrderHeader.net_amount), 0)).where(
        OrderHeader.created_at >= today_start,
        OrderHeader.status != "deleted",
    )
    sales_query = apply_tenant_filter(sales_query, OrderHeader, user)
    today_sales = (await db.execute(sales_query)).scalar() or 0

    orders_query = select(func.count()).select_from(OrderHeader).where(
        OrderHeader.created_at >= today_start,
        OrderHeader.status != "deleted",
    )
    orders_query = apply_tenant_filter(orders_query, OrderHeader, user)
    today_orders = (await db.execute(orders_query)).scalar() or 0

    tables_query = select(func.count()).select_from(Table).where(Table.status != "deleted")
    tables_query = apply_tenant_filter(tables_query, Table, user)
    total_tables = (await db.execute(tables_query)).scalar() or 0

    active_query = select(func.count()).select_from(Table).where(
        Table.table_status == "occupied",
        Table.status != "deleted",
    )
    active_query = apply_tenant_filter(active_query, Table, user)
    active_tables = (await db.execute(active_query)).scalar() or 0

    kot_query = select(func.count()).select_from(KotTicket).where(
        KotTicket.kot_status.in_(["queued", "preparing"]),
        KotTicket.status != "deleted",
    )
    kot_query = apply_tenant_filter(kot_query, KotTicket, user)
    pending_kots = (await db.execute(kot_query)).scalar() or 0

    stock_query = select(func.count()).select_from(Ingredient).where(
        Ingredient.current_stock <= Ingredient.reorder_level,
        Ingredient.status != "deleted",
    )
    stock_query = apply_tenant_filter(stock_query, Ingredient, user)
    low_stock = (await db.execute(stock_query)).scalar() or 0

    top_query = (
        select(OrderLine.item_name, func.sum(OrderLine.quantity).label("qty"))
        .join(OrderHeader, OrderLine.order_id == OrderHeader.id)
        .where(OrderHeader.created_at >= today_start, OrderLine.status != "deleted")
        .group_by(OrderLine.item_name)
        .order_by(func.sum(OrderLine.quantity).desc())
        .limit(5)
    )
    top_result = await db.execute(top_query)
    top_items = [{"name": row[0], "quantity": int(row[1])} for row in top_result.all()]

    payment_query = (
        select(Payment.payment_method, func.sum(Payment.amount))
        .join(OrderHeader, Payment.order_id == OrderHeader.id)
        .where(OrderHeader.created_at >= today_start, Payment.payment_status == "completed")
        .group_by(Payment.payment_method)
    )
    payment_query = apply_tenant_filter(payment_query, Payment, user)
    payment_result = await db.execute(payment_query)
    payment_mix = {row[0]: float(row[1]) for row in payment_result.all()}

    recent_query = select(OrderHeader).where(OrderHeader.status != "deleted")
    recent_query = apply_tenant_filter(recent_query, OrderHeader, user)
    recent_result = await db.execute(recent_query.order_by(OrderHeader.created_at.desc()).limit(10))
    recent_orders = [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "order_type": o.order_type,
            "net_amount": o.net_amount,
            "order_status": o.order_status,
            "payment_status": o.payment_status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in recent_result.scalars().all()
    ]

    return DashboardStats(
        today_sales=float(today_sales),
        today_orders=int(today_orders),
        active_tables=int(active_tables),
        total_tables=int(total_tables),
        pending_kots=int(pending_kots),
        low_stock_items=int(low_stock),
        top_items=top_items,
        payment_mix=payment_mix,
        recent_orders=recent_orders,
    )


@router.get("/list")
async def list_reports(user: dict = Depends(get_current_user)):
    return {
        "reports": [
            {"id": "sales", "name": "Sales Report", "endpoint": "/reports/dashboard"},
            {"id": "inventory", "name": "Inventory Report", "endpoint": "/inventory/list"},
            {"id": "orders", "name": "Orders Report", "endpoint": "/orders/export"},
            {"id": "payments", "name": "Payments Report", "endpoint": "/payments/export"},
        ]
    }


@router.get("/detail/{report_id}")
async def report_detail(report_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    if report_id == "sales":
        return await dashboard_stats(db, user)
    return {"report_id": report_id, "message": "Use specific module export endpoints"}


@router.post("/create")
async def create_report(user: dict = Depends(get_current_user)):
    return {"message": "Scheduled reports coming soon", "user": user["id"]}


@router.patch("/update/{report_id}")
async def update_report(report_id: str, user: dict = Depends(get_current_user)):
    return {"report_id": report_id, "updated": True}


@router.patch("/status/{report_id}")
async def report_status(report_id: str, user: dict = Depends(get_current_user)):
    return {"report_id": report_id, "status": "active"}


@router.get("/export")
async def export_reports(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    stats = await dashboard_stats(db, user)
    return stats.model_dump()


@router.get("/platform")
async def platform_dashboard(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    if user["role"] != "super_admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Super admin only")

    rest_count = (await db.execute(select(func.count()).select_from(Restaurant).where(Restaurant.status == "active"))).scalar() or 0
    tenant_count = (await db.execute(select(func.count()).select_from(Tenant).where(Tenant.status == "active"))).scalar() or 0

    restaurants_result = await db.execute(select(Restaurant).where(Restaurant.status == "active"))
    restaurants = restaurants_result.scalars().all()

    restaurant_stats = []
    total_revenue = 0.0
    for rest in restaurants:
        rev = (
            await db.execute(
                select(func.coalesce(func.sum(OrderHeader.net_amount), 0)).where(
                    OrderHeader.restaurant_id == rest.id,
                    OrderHeader.payment_status.in_(["paid", "completed"]),
                    OrderHeader.status != "deleted",
                )
            )
        ).scalar() or 0
        orders = (
            await db.execute(
                select(func.count()).select_from(OrderHeader).where(
                    OrderHeader.restaurant_id == rest.id, OrderHeader.status != "deleted"
                )
            )
        ).scalar() or 0
        branches = (
            await db.execute(
                select(func.count()).select_from(Branch).where(
                    Branch.restaurant_id == rest.id, Branch.status == "active"
                )
            )
        ).scalar() or 0
        tenant = await db.get(Tenant, rest.tenant_id)
        total_revenue += float(rev)
        restaurant_stats.append({
            "id": str(rest.id),
            "name": rest.name,
            "slug": rest.slug,
            "cuisine_type": rest.cuisine_type,
            "branches": int(branches),
            "total_orders": int(orders),
            "total_revenue": float(rev),
            "logo_url": tenant.logo_url if tenant else None,
            "primary_color": tenant.primary_color if tenant else "#F59E0B",
        })

    mrr = (
        await db.execute(
            select(func.coalesce(func.sum(TenantInvoice.amount), 0)).where(
                TenantInvoice.invoice_status == "paid"
            )
        )
    ).scalar() or 0

    return {
        "registered_restaurants": int(rest_count),
        "active_tenants": int(tenant_count),
        "platform_revenue": float(total_revenue),
        "subscription_mrr": float(mrr),
        "restaurants": restaurant_stats,
    }
