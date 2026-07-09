from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Branch, Customer, KotTicket, MenuItem, OrderHeader, OrderLine, Restaurant, Table, User
from app.schemas.entities import OrderLineResponse

router = APIRouter(prefix="/customer", tags=["customer"])


class CustomerRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    restaurant_slug: str
    branch_id: UUID | None = None


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str
    restaurant_slug: str


class CustomerOrderCreate(BaseModel):
    order_type: str  # dine_in, takeaway, delivery
    table_id: UUID | None = None
    branch_id: UUID
    lines: list[dict]
    notes: str | None = None


@router.post("/register")
async def customer_register(payload: CustomerRegister, db: AsyncSession = Depends(get_db)):
    rest_result = await db.execute(
        select(Restaurant).where(Restaurant.slug == payload.restaurant_slug, Restaurant.status == "active")
    )
    restaurant = rest_result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    branch_id = payload.branch_id
    if not branch_id:
        branch_result = await db.execute(
            select(Branch).where(Branch.restaurant_id == restaurant.id, Branch.status == "active").limit(1)
        )
        branch = branch_result.scalar_one_or_none()
        if not branch:
            raise HTTPException(status_code=400, detail="No active branch")
        branch_id = branch.id

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role="customer",
        restaurant_id=restaurant.id,
        branch_id=branch_id,
    )
    db.add(user)
    await db.flush()

    customer = Customer(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        restaurant_id=restaurant.id,
        branch_id=branch_id,
    )
    db.add(customer)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "role": "customer"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "customer_id": str(customer.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": "customer",
            "restaurant_id": str(restaurant.id),
            "restaurant_slug": restaurant.slug,
            "branch_id": str(branch_id),
        },
    }


@router.post("/login")
async def customer_login(payload: CustomerLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.role == "customer"))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    rest_result = await db.execute(select(Restaurant).where(Restaurant.slug == payload.restaurant_slug))
    restaurant = rest_result.scalar_one_or_none()
    if not restaurant or str(user.restaurant_id) != str(restaurant.id):
        raise HTTPException(status_code=403, detail="Not registered with this restaurant")

    cust_result = await db.execute(select(Customer).where(Customer.email == payload.email))
    customer = cust_result.scalar_one_or_none()

    token = create_access_token({"sub": str(user.id), "role": "customer"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "customer_id": str(customer.id) if customer else None,
            "email": user.email,
            "full_name": user.full_name,
            "role": "customer",
            "restaurant_id": str(user.restaurant_id),
            "restaurant_slug": restaurant.slug,
            "branch_id": str(user.branch_id) if user.branch_id else None,
        },
    }


@router.post("/order", status_code=status.HTTP_201_CREATED)
async def customer_place_order(
    payload: CustomerOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")

    if payload.order_type not in ("dine_in", "takeaway", "delivery"):
        raise HTTPException(status_code=400, detail="Invalid order type. Use dine_in, takeaway, or delivery")

    if payload.order_type == "dine_in" and not payload.table_id:
        raise HTTPException(status_code=400, detail="Table required for dine-in orders")

    branch = await db.get(Branch, payload.branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if payload.table_id:
        table = await db.get(Table, payload.table_id)
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        if table.table_status == "occupied" and payload.order_type == "dine_in":
            existing = await db.execute(
                select(OrderHeader).where(
                    OrderHeader.table_id == payload.table_id,
                    OrderHeader.order_status.notin_(["completed", "cancelled"]),
                ).limit(1)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Table already has an active order")

    cust_result = await db.execute(select(Customer).where(Customer.email == user["email"]))
    customer = cust_result.scalar_one_or_none()

    gross = 0.0
    lines_data = []
    for line in payload.lines:
        item = await db.get(MenuItem, UUID(line["menu_item_id"]))
        if not item or not item.is_available:
            raise HTTPException(status_code=400, detail=f"Item unavailable: {line.get('menu_item_id')}")
        qty = line.get("quantity", 1)
        line_total = item.price * qty
        gross += line_total
        lines_data.append((item, qty, line_total, line.get("notes")))

    tax = gross * (branch.tax_rate / 100)
    net = gross + tax

    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count_result = await db.execute(
        select(OrderHeader).where(OrderHeader.branch_id == payload.branch_id)
    )
    count = len(count_result.scalars().all())
    order_number = f"ORD-{today}-{count + 1:04d}"

    order = OrderHeader(
        restaurant_id=branch.restaurant_id,
        branch_id=payload.branch_id,
        order_number=order_number,
        order_type=payload.order_type,
        table_id=payload.table_id,
        customer_id=customer.id if customer else None,
        order_status="placed",
        gross_amount=gross,
        tax_amount=tax,
        net_amount=net,
        payment_status="unpaid",
        notes=payload.notes,
        created_by=UUID(user["id"]),
    )
    db.add(order)
    await db.flush()

    order_lines = []
    for item, qty, line_total, notes in lines_data:
        ol = OrderLine(
            restaurant_id=order.restaurant_id,
            branch_id=payload.branch_id,
            order_id=order.id,
            menu_item_id=item.id,
            item_name=item.name,
            quantity=qty,
            unit_price=item.price,
            line_total=line_total,
            line_status="placed",
            notes=notes,
            created_by=UUID(user["id"]),
        )
        db.add(ol)
        order_lines.append(ol)

    if payload.table_id and payload.order_type == "dine_in":
        table = await db.get(Table, payload.table_id)
        if table:
            table.table_status = "occupied"

    kot = KotTicket(
        restaurant_id=order.restaurant_id,
        branch_id=payload.branch_id,
        order_id=order.id,
        kot_number=f"KOT-{order_number.split('-')[-1]}",
        kitchen_station="main",
        kot_status="queued",
        created_by=UUID(user["id"]),
    )
    db.add(kot)
    order.order_status = "confirmed"
    await db.flush()

    from app.services.notifications import notify_order_event
    await notify_order_event(
        db, order=order, event_type="order_placed",
        title="Order confirmed", message=f"Your order {order.order_number} was sent to the kitchen",
    )

    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "order_type": order.order_type,
        "order_status": order.order_status,
        "net_amount": order.net_amount,
        "payment_status": order.payment_status,
        "kot_number": kot.kot_number,
        "message": "Order placed and sent to kitchen",
        "lines": [OrderLineResponse.model_validate(l).model_dump() for l in order_lines],
    }


@router.get("/orders")
async def customer_orders(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    cust_result = await db.execute(select(Customer).where(Customer.email == user["email"]))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        return {"items": []}
    result = await db.execute(
        select(OrderHeader).where(
            OrderHeader.customer_id == customer.id,
            OrderHeader.status != "deleted",
        ).order_by(OrderHeader.created_at.desc()).limit(50)
    )
    orders = result.scalars().all()
    items = []
    for o in orders:
        kot_result = await db.execute(select(KotTicket).where(KotTicket.order_id == o.id).limit(1))
        kot = kot_result.scalar_one_or_none()
        items.append({
            "id": str(o.id),
            "order_number": o.order_number,
            "order_type": o.order_type,
            "order_status": o.order_status,
            "net_amount": o.net_amount,
            "payment_status": o.payment_status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "kot_status": kot.kot_status if kot else None,
        })
    return {"items": items}


@router.get("/track/{order_id}")
async def track_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    order = await db.get(OrderHeader, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user["role"] == "customer":
        cust_result = await db.execute(select(Customer).where(Customer.email == user["email"]))
        customer = cust_result.scalar_one_or_none()
        if not customer or order.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Access denied")

    lines_result = await db.execute(
        select(OrderLine).where(OrderLine.order_id == order.id, OrderLine.status != "deleted")
    )
    lines = lines_result.scalars().all()
    kot_result = await db.execute(select(KotTicket).where(KotTicket.order_id == order.id))
    kots = kot_result.scalars().all()

    timeline = _build_timeline(order, kots)

    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "order_type": order.order_type,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "gross_amount": order.gross_amount,
        "tax_amount": order.tax_amount,
        "net_amount": order.net_amount,
        "table_id": str(order.table_id) if order.table_id else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "lines": [{"item_name": l.item_name, "quantity": l.quantity, "line_status": l.line_status, "line_total": l.line_total} for l in lines],
        "kots": [{"kot_number": k.kot_number, "kot_status": k.kot_status, "kitchen_station": k.kitchen_station} for k in kots],
        "timeline": timeline,
    }


def _build_timeline(order: OrderHeader, kots: list) -> list[dict]:
    steps = [
        {"step": "placed", "label": "Order Placed", "done": True},
        {"step": "confirmed", "label": "Sent to Kitchen", "done": order.order_status not in ("placed",)},
        {"step": "preparing", "label": "Being Prepared", "done": order.order_status in ("preparing", "ready", "served", "completed") or any(k.kot_status in ("preparing", "ready", "served") for k in kots)},
        {"step": "ready", "label": "Ready to Serve", "done": order.order_status in ("ready", "served", "completed") or any(k.kot_status in ("ready", "served") for k in kots)},
        {"step": "served", "label": "Served", "done": order.order_status in ("served", "completed")},
        {"step": "completed", "label": "Completed", "done": order.order_status == "completed"},
    ]
    current = order.order_status
    for s in steps:
        s["current"] = s["step"] == current
    return steps
