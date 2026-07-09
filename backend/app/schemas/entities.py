from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "customer"
    restaurant_id: UUID | None = None
    branch_id: UUID | None = None


class BaseEntity(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    restaurant_id: UUID | None = None
    branch_id: UUID | None = None
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None


# Tenant & Brand
class TenantCreate(BaseModel):
    name: str
    slug: str
    brand_style: str | None = None
    logo_url: str | None = None
    primary_color: str = "#F59E0B"
    secondary_color: str = "#DC2626"
    subscription_plan: str = "starter"
    settings: dict | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    brand_style: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    subscription_plan: str | None = None
    settings: dict | None = None
    status: str | None = None


class TenantResponse(BaseEntity):
    name: str
    slug: str
    brand_style: str | None = None
    logo_url: str | None = None
    primary_color: str
    secondary_color: str
    subscription_plan: str
    settings: dict | None = None


# Restaurant
class RestaurantCreate(BaseModel):
    tenant_id: UUID
    name: str
    slug: str
    description: str | None = None
    cuisine_type: str | None = None
    fssai_number: str | None = None
    gstin: str | None = None
    restaurant_id: UUID | None = None


class RestaurantUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cuisine_type: str | None = None
    fssai_number: str | None = None
    gstin: str | None = None
    status: str | None = None


class RestaurantResponse(BaseEntity):
    tenant_id: UUID
    name: str
    slug: str
    description: str | None = None
    cuisine_type: str | None = None
    fssai_number: str | None = None
    gstin: str | None = None


# Branch
class BranchCreate(BaseModel):
    restaurant_id: UUID
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None
    email: str | None = None
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"
    tax_rate: float = 5.0
    opening_hours: dict | None = None
    delivery_enabled: bool = False


class BranchUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    tax_rate: float | None = None
    opening_hours: dict | None = None
    delivery_enabled: bool | None = None
    status: str | None = None


class BranchResponse(BaseEntity):
    restaurant_id: UUID
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None
    email: str | None = None
    timezone: str
    currency: str
    tax_rate: float
    opening_hours: dict | None = None
    delivery_enabled: bool


# User / Staff
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: str
    restaurant_id: UUID | None = None
    branch_id: UUID | None = None
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None
    status: str | None = None


class UserResponse(BaseEntity):
    email: str
    full_name: str
    phone: str | None = None
    role: str
    avatar_url: str | None = None
    is_active: bool
    last_login: datetime | None = None


# Role
class RoleCreate(BaseModel):
    name: str
    code: str
    permissions: dict | None = None
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    permissions: dict | None = None
    description: str | None = None
    status: str | None = None


class RoleResponse(BaseEntity):
    name: str
    code: str
    permissions: dict | None = None
    description: str | None = None


# Floor
class FloorCreate(BaseModel):
    name: str
    sort_order: int = 0


class FloorUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    status: str | None = None


class FloorResponse(BaseEntity):
    name: str
    sort_order: int


# Table
class TableCreate(BaseModel):
    floor_id: UUID | None = None
    table_number: str
    capacity: int = 4
    table_status: str = "available"
    position_x: float | None = None
    position_y: float | None = None


class TableUpdate(BaseModel):
    floor_id: UUID | None = None
    table_number: str | None = None
    capacity: int | None = None
    table_status: str | None = None
    position_x: float | None = None
    position_y: float | None = None
    status: str | None = None


class TableResponse(BaseEntity):
    floor_id: UUID | None = None
    table_number: str
    capacity: int
    table_status: str
    position_x: float | None = None
    position_y: float | None = None


# Menu Category
class MenuCategoryCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool = True


class MenuCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    status: str | None = None


class MenuCategoryResponse(BaseEntity):
    name: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int
    is_active: bool


# Menu Item
class MenuItemCreate(BaseModel):
    category_id: UUID
    name: str
    description: str | None = None
    price: float
    image_url: str | None = None
    is_veg: bool = True
    is_available: bool = True
    prep_time_mins: int = 15
    kitchen_station: str = "main"
    sku: str | None = None


class MenuItemUpdate(BaseModel):
    category_id: UUID | None = None
    name: str | None = None
    description: str | None = None
    price: float | None = None
    image_url: str | None = None
    is_veg: bool | None = None
    is_available: bool | None = None
    prep_time_mins: int | None = None
    kitchen_station: str | None = None
    sku: str | None = None
    status: str | None = None


class MenuItemResponse(BaseEntity):
    category_id: UUID
    name: str
    description: str | None = None
    price: float
    image_url: str | None = None
    is_veg: bool
    is_available: bool
    prep_time_mins: int
    kitchen_station: str
    sku: str | None = None


# Order
class OrderLineInput(BaseModel):
    menu_item_id: UUID
    quantity: int = 1
    modifiers: dict | None = None
    notes: str | None = None


class OrderCreate(BaseModel):
    order_type: str = "dine_in"
    table_id: UUID | None = None
    customer_id: UUID | None = None
    coupon_code: str | None = None
    notes: str | None = None
    lines: list[OrderLineInput]


class OrderUpdate(BaseModel):
    order_status: str | None = None
    payment_status: str | None = None
    discount_amount: float | None = None
    notes: str | None = None
    status: str | None = None


class OrderLineResponse(BaseEntity):
    order_id: UUID
    menu_item_id: UUID
    item_name: str
    quantity: int
    unit_price: float
    line_total: float
    modifiers: dict | None = None
    line_status: str
    notes: str | None = None


class OrderResponse(BaseEntity):
    order_number: str
    order_type: str
    table_id: UUID | None = None
    customer_id: UUID | None = None
    waiter_id: UUID | None = None
    order_status: str
    gross_amount: float
    discount_amount: float
    tax_amount: float
    net_amount: float
    payment_status: str
    coupon_code: str | None = None
    notes: str | None = None
    lines: list[OrderLineResponse] = []


# KOT
class KotCreate(BaseModel):
    order_id: UUID
    kitchen_station: str = "main"
    priority: int = 0


class KotUpdate(BaseModel):
    kot_status: str | None = None
    priority: int | None = None
    status: str | None = None


class KotResponse(BaseEntity):
    order_id: UUID
    kot_number: str
    kitchen_station: str
    kot_status: str
    priority: int
    fired_at: datetime
    completed_at: datetime | None = None


# Payment
class PaymentCreate(BaseModel):
    order_id: UUID
    amount: float
    payment_method: str
    gateway_ref: str | None = None
    transaction_id: str | None = None


class PaymentUpdate(BaseModel):
    payment_status: str | None = None
    gateway_ref: str | None = None
    transaction_id: str | None = None
    status: str | None = None


class PaymentResponse(BaseEntity):
    order_id: UUID
    amount: float
    payment_method: str
    payment_status: str
    gateway_ref: str | None = None
    transaction_id: str | None = None


# Customer
class CustomerCreate(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    loyalty_points: int = 0
    tier: str = "bronze"


class CustomerUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    loyalty_points: int | None = None
    tier: str | None = None
    status: str | None = None


class CustomerResponse(BaseEntity):
    full_name: str
    email: str | None = None
    phone: str | None = None
    loyalty_points: int
    tier: str


# Coupon
class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percent"
    discount_value: float
    min_order_amount: float = 0.0
    max_uses: int | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None


class CouponUpdate(BaseModel):
    discount_type: str | None = None
    discount_value: float | None = None
    min_order_amount: float | None = None
    max_uses: int | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    status: str | None = None


class CouponResponse(BaseEntity):
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float
    max_uses: int | None = None
    used_count: int
    valid_from: datetime | None = None
    valid_until: datetime | None = None


# Ingredient / Inventory
class IngredientCreate(BaseModel):
    name: str
    unit: str = "kg"
    current_stock: float = 0.0
    reorder_level: float = 10.0
    cost_per_unit: float = 0.0


class IngredientUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    current_stock: float | None = None
    reorder_level: float | None = None
    cost_per_unit: float | None = None
    status: str | None = None


class IngredientResponse(BaseEntity):
    name: str
    unit: str
    current_stock: float
    reorder_level: float
    cost_per_unit: float


# Supplier
class SupplierCreate(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    payment_terms: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    payment_terms: str | None = None
    status: str | None = None


class SupplierResponse(BaseEntity):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    payment_terms: str | None = None


# Purchase Order
class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    po_number: str
    total_amount: float = 0.0
    po_status: str = "draft"
    expected_date: datetime | None = None


class PurchaseOrderUpdate(BaseModel):
    total_amount: float | None = None
    po_status: str | None = None
    expected_date: datetime | None = None
    status: str | None = None


class PurchaseOrderResponse(BaseEntity):
    supplier_id: UUID
    po_number: str
    total_amount: float
    po_status: str
    expected_date: datetime | None = None


# Reservation
class ReservationCreate(BaseModel):
    customer_id: UUID | None = None
    table_id: UUID | None = None
    guest_name: str
    guest_phone: str | None = None
    guest_count: int = 2
    reserved_at: datetime
    event_type: str | None = None
    notes: str | None = None
    reservation_status: str = "confirmed"


class ReservationUpdate(BaseModel):
    table_id: UUID | None = None
    guest_name: str | None = None
    guest_phone: str | None = None
    guest_count: int | None = None
    reserved_at: datetime | None = None
    event_type: str | None = None
    notes: str | None = None
    reservation_status: str | None = None
    status: str | None = None


class ReservationResponse(BaseEntity):
    customer_id: UUID | None = None
    table_id: UUID | None = None
    guest_name: str
    guest_phone: str | None = None
    guest_count: int
    reserved_at: datetime
    event_type: str | None = None
    notes: str | None = None
    reservation_status: str


# Delivery
class DeliveryOrderCreate(BaseModel):
    order_id: UUID
    rider_id: UUID | None = None
    address_id: UUID | None = None
    delivery_status: str = "pending"
    estimated_time: datetime | None = None


class DeliveryOrderUpdate(BaseModel):
    rider_id: UUID | None = None
    delivery_status: str | None = None
    estimated_time: datetime | None = None
    delivered_at: datetime | None = None
    status: str | None = None


class DeliveryOrderResponse(BaseEntity):
    order_id: UUID
    rider_id: UUID | None = None
    address_id: UUID | None = None
    delivery_status: str
    estimated_time: datetime | None = None
    delivered_at: datetime | None = None


# Rider
class RiderCreate(BaseModel):
    user_id: UUID | None = None
    name: str
    phone: str
    vehicle_type: str | None = None
    is_available: bool = True


class RiderUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    vehicle_type: str | None = None
    is_available: bool | None = None
    status: str | None = None


class RiderResponse(BaseEntity):
    user_id: UUID | None = None
    name: str
    phone: str
    vehicle_type: str | None = None
    is_available: bool


# Loyalty
class LoyaltyTransactionCreate(BaseModel):
    customer_id: UUID
    points: int
    transaction_type: str
    order_id: UUID | None = None
    notes: str | None = None


class LoyaltyTransactionUpdate(BaseModel):
    points: int | None = None
    transaction_type: str | None = None
    notes: str | None = None
    status: str | None = None


class LoyaltyTransactionResponse(BaseEntity):
    customer_id: UUID
    points: int
    transaction_type: str
    order_id: UUID | None = None
    notes: str | None = None


# Finance
class FinanceEntryCreate(BaseModel):
    entry_type: str
    category: str
    amount: float
    description: str | None = None
    reference_type: str | None = None
    reference_id: UUID | None = None
    entry_date: datetime | None = None


class FinanceEntryUpdate(BaseModel):
    entry_type: str | None = None
    category: str | None = None
    amount: float | None = None
    description: str | None = None
    status: str | None = None


class FinanceEntryResponse(BaseEntity):
    entry_type: str
    category: str
    amount: float
    description: str | None = None
    reference_type: str | None = None
    reference_id: UUID | None = None
    entry_date: datetime


# CMS
class CmsContentCreate(BaseModel):
    page_key: str
    title: str
    body: str | None = None
    content_type: str = "page"
    is_published: bool = True


class CmsContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    content_type: str | None = None
    is_published: bool | None = None
    status: str | None = None


class CmsContentResponse(BaseEntity):
    page_key: str
    title: str
    body: str | None = None
    content_type: str
    is_published: bool


# Integration
class IntegrationCreate(BaseModel):
    provider: str
    integration_type: str
    config: dict | None = None
    is_enabled: bool = False


class IntegrationUpdate(BaseModel):
    config: dict | None = None
    is_enabled: bool | None = None
    status: str | None = None


class IntegrationResponse(BaseEntity):
    provider: str
    integration_type: str
    config: dict | None = None
    is_enabled: bool


# Audit Log
class AuditLogResponse(BaseEntity):
    user_id: UUID | None = None
    action: str
    entity_type: str
    entity_id: UUID | None = None
    old_values: dict | None = None
    new_values: dict | None = None
    ip_address: str | None = None


# Subscription
class SubscriptionPlanCreate(BaseModel):
    name: str
    code: str
    price_monthly: float
    features: dict | None = None
    max_branches: int = 1


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    price_monthly: float | None = None
    features: dict | None = None
    max_branches: int | None = None
    status: str | None = None


class SubscriptionPlanResponse(BaseEntity):
    name: str
    code: str
    price_monthly: float
    features: dict | None = None
    max_branches: int


# Tenant Invoice
class TenantInvoiceCreate(BaseModel):
    tenant_id: UUID
    invoice_number: str
    amount: float
    invoice_status: str = "pending"
    due_date: datetime | None = None


class TenantInvoiceUpdate(BaseModel):
    amount: float | None = None
    invoice_status: str | None = None
    due_date: datetime | None = None
    paid_at: datetime | None = None
    status: str | None = None


class TenantInvoiceResponse(BaseEntity):
    tenant_id: UUID
    invoice_number: str
    amount: float
    invoice_status: str
    due_date: datetime | None = None
    paid_at: datetime | None = None


# Notification
class NotificationCreate(BaseModel):
    user_id: UUID | None = None
    title: str
    message: str
    channel: str = "in_app"


class NotificationUpdate(BaseModel):
    is_read: bool | None = None
    status: str | None = None


class NotificationResponse(BaseEntity):
    user_id: UUID | None = None
    title: str
    message: str
    channel: str
    is_read: bool


# Recipe
class RecipeCreate(BaseModel):
    menu_item_id: UUID
    name: str
    yield_qty: float = 1.0
    ingredients: dict | None = None


class RecipeUpdate(BaseModel):
    name: str | None = None
    yield_qty: float | None = None
    ingredients: dict | None = None
    status: str | None = None


class RecipeResponse(BaseEntity):
    menu_item_id: UUID
    name: str
    yield_qty: float
    ingredients: dict | None = None


# Stock Ledger
class StockLedgerCreate(BaseModel):
    ingredient_id: UUID
    movement_type: str
    quantity: float
    reference_type: str | None = None
    reference_id: UUID | None = None
    notes: str | None = None


class StockLedgerUpdate(BaseModel):
    notes: str | None = None
    status: str | None = None


class StockLedgerResponse(BaseEntity):
    ingredient_id: UUID
    movement_type: str
    quantity: float
    reference_type: str | None = None
    reference_id: UUID | None = None
    notes: str | None = None


# Day Close
class DayCloseCreate(BaseModel):
    close_date: datetime
    total_sales: float = 0.0
    total_orders: int = 0
    cash_total: float = 0.0
    upi_total: float = 0.0
    card_total: float = 0.0
    notes: str | None = None


class DayCloseUpdate(BaseModel):
    total_sales: float | None = None
    total_orders: int | None = None
    cash_total: float | None = None
    upi_total: float | None = None
    card_total: float | None = None
    notes: str | None = None
    status: str | None = None


class DayCloseResponse(BaseEntity):
    close_date: datetime
    total_sales: float
    total_orders: int
    cash_total: float
    upi_total: float
    card_total: float
    notes: str | None = None


# Dashboard
class DashboardStats(BaseModel):
    today_sales: float
    today_orders: int
    active_tables: int
    total_tables: int
    pending_kots: int
    low_stock_items: int
    top_items: list[dict]
    payment_mix: dict
    recent_orders: list[dict]
