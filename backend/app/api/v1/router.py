from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.api.v1 import auth, customer, kot as kot_api, orders, public, reports, staff, tables as tables_api
from app.models import (
    AuditLog,
    Branch,
    CashDrawer,
    CmsContent,
    Coupon,
    Customer,
    CustomerAddress,
    DayClose,
    DeliveryOrder,
    DeviceSession,
    FinanceEntry,
    Floor,
    GoodsReceipt,
    Ingredient,
    Integration,
    KotTicket,
    LoyaltyTransaction,
    MenuCategory,
    MenuItem,
    Notification,
    Payment,
    PaymentWebhook,
    Permission,
    PrinterJob,
    PurchaseOrder,
    PurchaseOrderLine,
    Recipe,
    Refund,
    Reservation,
    Restaurant,
    Rider,
    Role,
    StaffShift,
    StockLedger,
    StockTransfer,
    SubscriptionPlan,
    Supplier,
    Table,
    Tenant,
    TenantInvoice,
    User,
    Wastage,
    WebhookEndpoint,
)
from app.schemas import entities as s

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(staff.router)
api_router.include_router(tables_api.router)
api_router.include_router(customer.router)
api_router.include_router(kot_api.router)
api_router.include_router(orders.router)
api_router.include_router(reports.router)
api_router.include_router(public.router)

CRUD_ROUTES = [
    ("tenants", Tenant, s.TenantCreate, s.TenantUpdate, s.TenantResponse, "tenants"),
    ("restaurants", Restaurant, s.RestaurantCreate, s.RestaurantUpdate, s.RestaurantResponse, "restaurants"),
    ("branches", Branch, s.BranchCreate, s.BranchUpdate, s.BranchResponse, "branches"),
    ("roles", Role, s.RoleCreate, s.RoleUpdate, s.RoleResponse, "roles"),
    ("floors", Floor, s.FloorCreate, s.FloorUpdate, s.FloorResponse, "floors"),
    ("tables", Table, s.TableCreate, s.TableUpdate, s.TableResponse, "tables"),
    ("menus/categories", MenuCategory, s.MenuCategoryCreate, s.MenuCategoryUpdate, s.MenuCategoryResponse, "menus"),
    ("menus/items", MenuItem, s.MenuItemCreate, s.MenuItemUpdate, s.MenuItemResponse, "menus"),
    ("menus/recipes", Recipe, s.RecipeCreate, s.RecipeUpdate, s.RecipeResponse, "menus"),
    ("kot", KotTicket, s.KotCreate, s.KotUpdate, s.KotResponse, "kot"),
    ("payments", Payment, s.PaymentCreate, s.PaymentUpdate, s.PaymentResponse, "payments"),
    ("customers", Customer, s.CustomerCreate, s.CustomerUpdate, s.CustomerResponse, "customers"),
    ("coupons", Coupon, s.CouponCreate, s.CouponUpdate, s.CouponResponse, "coupons"),
    ("inventory", Ingredient, s.IngredientCreate, s.IngredientUpdate, s.IngredientResponse, "inventory"),
    ("inventory/ledger", StockLedger, s.StockLedgerCreate, s.StockLedgerUpdate, s.StockLedgerResponse, "inventory"),
    ("suppliers", Supplier, s.SupplierCreate, s.SupplierUpdate, s.SupplierResponse, "suppliers"),
    ("suppliers/purchase-orders", PurchaseOrder, s.PurchaseOrderCreate, s.PurchaseOrderUpdate, s.PurchaseOrderResponse, "suppliers"),
    ("reservations", Reservation, s.ReservationCreate, s.ReservationUpdate, s.ReservationResponse, "reservations"),
    ("delivery", DeliveryOrder, s.DeliveryOrderCreate, s.DeliveryOrderUpdate, s.DeliveryOrderResponse, "delivery"),
    ("delivery/riders", Rider, s.RiderCreate, s.RiderUpdate, s.RiderResponse, "delivery"),
    ("loyalty", LoyaltyTransaction, s.LoyaltyTransactionCreate, s.LoyaltyTransactionUpdate, s.LoyaltyTransactionResponse, "loyalty"),
    ("finance", FinanceEntry, s.FinanceEntryCreate, s.FinanceEntryUpdate, s.FinanceEntryResponse, "finance"),
    ("finance/day-close", DayClose, s.DayCloseCreate, s.DayCloseUpdate, s.DayCloseResponse, "finance"),
    ("cms", CmsContent, s.CmsContentCreate, s.CmsContentUpdate, s.CmsContentResponse, "cms"),
    ("integrations", Integration, s.IntegrationCreate, s.IntegrationUpdate, s.IntegrationResponse, "integrations"),
    ("subscriptions/plans", SubscriptionPlan, s.SubscriptionPlanCreate, s.SubscriptionPlanUpdate, s.SubscriptionPlanResponse, "subscriptions"),
    ("subscriptions/invoices", TenantInvoice, s.TenantInvoiceCreate, s.TenantInvoiceUpdate, s.TenantInvoiceResponse, "subscriptions"),
    ("notifications", Notification, s.NotificationCreate, s.NotificationUpdate, s.NotificationResponse, "notifications"),
]

for prefix, model, create_s, update_s, response_s, tag in CRUD_ROUTES:
    api_router.include_router(
        make_crud_router(f"/{prefix}", model, create_s, update_s, response_s, tag)
    )

# Devices router (device sessions)
api_router.include_router(
    make_crud_router("/devices", DeviceSession, s.NotificationCreate, s.NotificationUpdate, s.NotificationResponse, "devices")
)

# Webhooks router
api_router.include_router(
    make_crud_router("/webhooks", WebhookEndpoint, s.IntegrationCreate, s.IntegrationUpdate, s.IntegrationResponse, "webhooks")
)

# Audit logs - read + export only via list/detail/export
api_router.include_router(
    make_crud_router("/audit", AuditLog, s.FinanceEntryCreate, s.FinanceEntryUpdate, s.AuditLogResponse, "audit")
)
