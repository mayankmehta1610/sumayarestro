"""Role-based module access per requirement pack Role Access Matrix."""

ROLE_MODULES: dict[str, list[str]] = {
    "super_admin": [
        "platform-dashboard", "tenants", "restaurants", "subscriptions", "audit",
    ],
    "restaurant_owner": [
        "dashboard", "branches", "staff", "tables", "menu", "orders", "kitchen",
        "billing", "customers", "coupons", "inventory", "suppliers", "delivery",
        "reservations", "waitlist", "reports", "finance", "cms", "integrations", "notifications",
    ],
    "branch_manager": [
        "dashboard", "tables", "staff", "menu", "orders", "kitchen", "billing",
        "customers", "coupons", "inventory", "suppliers", "delivery", "reservations",
        "reports", "finance",
    ],
    "cashier": ["dashboard", "tables", "orders", "billing"],
    "waiter": ["dashboard", "tables", "orders"],
    "kitchen_staff": ["kitchen", "orders"],
    "inventory_manager": ["dashboard", "inventory", "suppliers"],
    "supplier_manager": ["dashboard", "suppliers", "inventory"],
    "delivery_operator": ["dashboard", "delivery", "orders"],
    "customer": ["menu", "my-orders", "book-table", "join-queue"],
    "support_admin": ["dashboard", "tenants", "orders", "audit"],
}

ORDER_STATUS_FLOW = ["placed", "confirmed", "preparing", "ready", "served", "completed", "cancelled"]
KOT_STATUS_FLOW = ["queued", "preparing", "ready", "served"]


def can_access(role: str, module: str) -> bool:
    return module in ROLE_MODULES.get(role, [])


def get_modules_for_role(role: str) -> list[str]:
    return ROLE_MODULES.get(role, [])
