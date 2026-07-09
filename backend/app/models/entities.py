import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TenantMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True, nullable=True)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Tenant(Base, TenantMixin):
    __tablename__ = "tenants"
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    brand_style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(20), default="#F59E0B")
    secondary_color: Mapped[str] = mapped_column(String(20), default="#DC2626")
    subscription_plan: Mapped[str] = mapped_column(String(50), default="starter")
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Restaurant(Base, TenantMixin):
    __tablename__ = "restaurants"
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cuisine_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fssai_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Branch(Base, TenantMixin):
    __tablename__ = "branches"
    restaurant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("restaurants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50), index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    tax_rate: Mapped[float] = mapped_column(Float, default=5.0)
    opening_hours: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    delivery_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    service_charge_rate: Mapped[float] = mapped_column(Float, default=0.0)
    __table_args__ = (UniqueConstraint("restaurant_id", "code", name="uq_branch_code"),)


class User(Base, TenantMixin):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(50), index=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Role(Base, TenantMixin):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str] = mapped_column(String(50), index=True)
    permissions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Permission(Base, TenantMixin):
    __tablename__ = "permissions"
    module: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(50))
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class StaffShift(Base, TenantMixin):
    __tablename__ = "staff_shifts"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    shift_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    shift_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Floor(Base, TenantMixin):
    __tablename__ = "floors"
    name: Mapped[str] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Table(Base, TenantMixin):
    __tablename__ = "tables"
    floor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("floors.id"), nullable=True)
    table_number: Mapped[str] = mapped_column(String(20), index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    table_status: Mapped[str] = mapped_column(String(30), default="available", index=True)
    position_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    position_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    __table_args__ = (UniqueConstraint("branch_id", "table_number", name="uq_table_number"),)


class TableQrCode(Base, TenantMixin):
    __tablename__ = "table_qr_codes"
    table_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tables.id"), index=True)
    qr_token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    qr_url: Mapped[str] = mapped_column(String(500))


class Reservation(Base, TenantMixin):
    __tablename__ = "reservations"
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    table_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True)
    guest_name: Mapped[str] = mapped_column(String(255))
    guest_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    guest_count: Mapped[int] = mapped_column(Integer, default=2)
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reservation_status: Mapped[str] = mapped_column(String(30), default="confirmed")


class Customer(Base, TenantMixin):
    __tablename__ = "customers"
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    tier: Mapped[str] = mapped_column(String(30), default="bronze")


class CustomerAddress(Base, TenantMixin):
    __tablename__ = "customer_addresses"
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), index=True)
    label: Mapped[str] = mapped_column(String(50), default="home")
    address_line: Mapped[str] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class MenuCategory(Base, TenantMixin):
    __tablename__ = "menu_categories"
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class MenuItem(Base, TenantMixin):
    __tablename__ = "menu_items"
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_categories.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    prep_time_mins: Mapped[int] = mapped_column(Integer, default=15)
    kitchen_station: Mapped[str] = mapped_column(String(50), default="main")
    sku: Mapped[str | None] = mapped_column(String(50), nullable=True)


class ItemVariant(Base, TenantMixin):
    __tablename__ = "item_variants"
    menu_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_items.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    price_delta: Mapped[float] = mapped_column(Float, default=0.0)


class Modifier(Base, TenantMixin):
    __tablename__ = "modifiers"
    menu_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    price: Mapped[float] = mapped_column(Float, default=0.0)
    modifier_group: Mapped[str | None] = mapped_column(String(50), nullable=True)


class Combo(Base, TenantMixin):
    __tablename__ = "combos"
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float)
    items: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Recipe(Base, TenantMixin):
    __tablename__ = "recipes"
    menu_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_items.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    yield_qty: Mapped[float] = mapped_column(Float, default=1.0)
    ingredients: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Ingredient(Base, TenantMixin):
    __tablename__ = "ingredients"
    name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_level: Mapped[float] = mapped_column(Float, default=10.0)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)


class Supplier(Base, TenantMixin):
    __tablename__ = "suppliers"
    name: Mapped[str] = mapped_column(String(255))
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)


class PurchaseOrder(Base, TenantMixin):
    __tablename__ = "purchase_orders"
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), index=True)
    po_number: Mapped[str] = mapped_column(String(50), index=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    po_status: Mapped[str] = mapped_column(String(30), default="draft")
    expected_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PurchaseOrderLine(Base, TenantMixin):
    __tablename__ = "purchase_order_lines"
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), index=True)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Float)
    line_total: Mapped[float] = mapped_column(Float)


class GoodsReceipt(Base, TenantMixin):
    __tablename__ = "goods_receipts"
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), index=True)
    grn_number: Mapped[str] = mapped_column(String(50), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class StockLedger(Base, TenantMixin):
    __tablename__ = "stock_ledger"
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), index=True)
    movement_type: Mapped[str] = mapped_column(String(30))
    quantity: Mapped[float] = mapped_column(Float)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class StockTransfer(Base, TenantMixin):
    __tablename__ = "stock_transfers"
    from_branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    to_branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    transfer_status: Mapped[str] = mapped_column(String(30), default="pending")


class Wastage(Base, TenantMixin):
    __tablename__ = "wastage"
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OrderHeader(Base, TenantMixin):
    __tablename__ = "order_headers"
    order_number: Mapped[str] = mapped_column(String(50), index=True)
    order_type: Mapped[str] = mapped_column(String(30), default="dine_in")
    table_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    waiter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    order_status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    gross_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    service_charge_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    payment_status: Mapped[str] = mapped_column(String(30), default="unpaid")
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class OrderLine(Base, TenantMixin):
    __tablename__ = "order_lines"
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_headers.id"), index=True)
    menu_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_items.id"), index=True)
    item_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float)
    line_total: Mapped[float] = mapped_column(Float)
    modifiers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    line_status: Mapped[str] = mapped_column(String(30), default="pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class KotTicket(Base, TenantMixin):
    __tablename__ = "kot_tickets"
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_headers.id"), index=True)
    kot_number: Mapped[str] = mapped_column(String(50), index=True)
    kitchen_station: Mapped[str] = mapped_column(String(50), default="main")
    kot_status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    fired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KotItemStatus(Base, TenantMixin):
    __tablename__ = "kot_item_statuses"
    kot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("kot_tickets.id"), index=True)
    order_line_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_lines.id"), index=True)
    item_status: Mapped[str] = mapped_column(String(30), default="queued")


class Payment(Base, TenantMixin):
    __tablename__ = "payments"
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_headers.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    payment_method: Mapped[str] = mapped_column(String(30))
    payment_status: Mapped[str] = mapped_column(String(30), default="pending")
    gateway_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)


class PaymentWebhook(Base, TenantMixin):
    __tablename__ = "payment_webhooks"
    provider: Mapped[str] = mapped_column(String(50))
    event_type: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)


class Refund(Base, TenantMixin):
    __tablename__ = "refunds"
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    refund_status: Mapped[str] = mapped_column(String(30), default="pending")


class Coupon(Base, TenantMixin):
    __tablename__ = "coupons"
    code: Mapped[str] = mapped_column(String(50), index=True)
    discount_type: Mapped[str] = mapped_column(String(20), default="percent")
    discount_value: Mapped[float] = mapped_column(Float)
    min_order_amount: Mapped[float] = mapped_column(Float, default=0.0)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("restaurant_id", "code", name="uq_coupon_code"),)


class LoyaltyTransaction(Base, TenantMixin):
    __tablename__ = "loyalty_transactions"
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), index=True)
    points: Mapped[int] = mapped_column(Integer)
    transaction_type: Mapped[str] = mapped_column(String(30))
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("order_headers.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DeliveryOrder(Base, TenantMixin):
    __tablename__ = "delivery_orders"
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_headers.id"), index=True)
    rider_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("riders.id"), nullable=True)
    address_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_addresses.id"), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    estimated_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Rider(Base, TenantMixin):
    __tablename__ = "riders"
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(20))
    vehicle_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)


class CashDrawer(Base, TenantMixin):
    __tablename__ = "cash_drawers"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    opening_balance: Mapped[float] = mapped_column(Float, default=0.0)
    closing_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    drawer_status: Mapped[str] = mapped_column(String(30), default="open")


class DayClose(Base, TenantMixin):
    __tablename__ = "day_closes"
    close_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    total_sales: Mapped[float] = mapped_column(Float, default=0.0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    cash_total: Mapped[float] = mapped_column(Float, default=0.0)
    upi_total: Mapped[float] = mapped_column(Float, default=0.0)
    card_total: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class AuditLog(Base, TenantMixin):
    __tablename__ = "audit_logs"
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    old_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)


class SubscriptionPlan(Base, TenantMixin):
    __tablename__ = "subscription_plans"
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str] = mapped_column(String(50), unique=True)
    price_monthly: Mapped[float] = mapped_column(Float)
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    max_branches: Mapped[int] = mapped_column(Integer, default=1)


class TenantInvoice(Base, TenantMixin):
    __tablename__ = "tenant_invoices"
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), index=True)
    amount: Mapped[float] = mapped_column(Float)
    invoice_status: Mapped[str] = mapped_column(String(30), default="pending")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Notification(Base, TenantMixin):
    __tablename__ = "notifications"
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(30), default="in_app")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    event_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)


class WaitlistEntry(Base, TenantMixin):
    __tablename__ = "waitlist_entries"
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    guest_name: Mapped[str] = mapped_column(String(255))
    guest_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    party_size: Mapped[int] = mapped_column(Integer, default=2)
    queue_number: Mapped[int] = mapped_column(Integer, index=True)
    waitlist_status: Mapped[str] = mapped_column(String(30), default="waiting", index=True)
    table_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True)
    estimated_wait_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    seated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DeviceSession(Base, TenantMixin):
    __tablename__ = "device_sessions"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    device_type: Mapped[str] = mapped_column(String(50))
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)


class PrinterJob(Base, TenantMixin):
    __tablename__ = "printer_jobs"
    job_type: Mapped[str] = mapped_column(String(50))
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_status: Mapped[str] = mapped_column(String(30), default="queued")
    printer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)


class CmsContent(Base, TenantMixin):
    __tablename__ = "cms_contents"
    page_key: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(String(50), default="page")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)


class Integration(Base, TenantMixin):
    __tablename__ = "integrations"
    provider: Mapped[str] = mapped_column(String(100))
    integration_type: Mapped[str] = mapped_column(String(50))
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)


class WebhookEndpoint(Base, TenantMixin):
    __tablename__ = "webhook_endpoints"
    url: Mapped[str] = mapped_column(String(500))
    events: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class FinanceEntry(Base, TenantMixin):
    __tablename__ = "finance_entries"
    entry_type: Mapped[str] = mapped_column(String(30))
    category: Mapped[str] = mapped_column(String(100))
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    entry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
