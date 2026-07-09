import {
  Building2, ChefHat, ClipboardList, CreditCard, Gift, Globe, LayoutDashboard,
  MapPin, Package, Percent, Receipt, Settings, Shield, ShoppingBag, Store,
  Truck, Users, Utensils, Warehouse, Calendar, BarChart3, Smartphone, Crown,
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  icon: typeof LayoutDashboard;
  path: string;
  apiEndpoint: string;
  phase: string;
  fields: FieldConfig[];
  customPage?: boolean;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'checkbox' | 'datetime';
  required?: boolean;
  options?: { value: string; label: string }[];
  createOnly?: boolean;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard',
    apiEndpoint: '/reports', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'tenants', name: 'Tenant & Brand', icon: Crown, path: '/admin/tenants',
    apiEndpoint: '/tenants', phase: '1',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'URL Slug', type: 'text', required: true },
      { key: 'brand_style', label: 'Brand Style', type: 'text' },
      { key: 'primary_color', label: 'Primary Color', type: 'text' },
      { key: 'secondary_color', label: 'Secondary Color', type: 'text' },
      { key: 'subscription_plan', label: 'Plan', type: 'select', options: [
        { value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Professional' },
      ]},
    ],
  },
  {
    id: 'branches', name: 'Branches', icon: MapPin, path: '/admin/branches',
    apiEndpoint: '/branches', phase: '1',
    fields: [
      { key: 'restaurant_id', label: 'Restaurant ID', type: 'text', required: true },
      { key: 'name', label: 'Branch Name', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'tax_rate', label: 'Tax Rate %', type: 'number' },
      { key: 'delivery_enabled', label: 'Delivery Enabled', type: 'checkbox' },
    ],
  },
  {
    id: 'staff', name: 'Staff & RBAC', icon: Users, path: '/admin/staff',
    apiEndpoint: '/staff', phase: '1',
    fields: [
      { key: 'full_name', label: 'Full Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'password', label: 'Password', type: 'text', required: true, createOnly: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'role', label: 'Role', type: 'select', required: true, options: [
        { value: 'restaurant_owner', label: 'Owner' }, { value: 'branch_manager', label: 'Manager' },
        { value: 'cashier', label: 'Cashier' }, { value: 'waiter', label: 'Waiter' },
        { value: 'kitchen_staff', label: 'Kitchen' }, { value: 'inventory_manager', label: 'Inventory' },
      ]},
    ],
  },
  {
    id: 'roles', name: 'Roles', icon: Shield, path: '/admin/roles',
    apiEndpoint: '/roles', phase: '1',
    fields: [
      { key: 'name', label: 'Role Name', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'floors', name: 'Floors', icon: Building2, path: '/admin/floors',
    apiEndpoint: '/floors', phase: '1',
    fields: [
      { key: 'name', label: 'Floor Name', type: 'text', required: true },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    id: 'tables', name: 'Tables & Seating', icon: Utensils, path: '/admin/tables',
    apiEndpoint: '/tables', phase: '1',
    fields: [
      { key: 'table_number', label: 'Table #', type: 'text', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'table_status', label: 'Status', type: 'select', options: [
        { value: 'available', label: 'Available' }, { value: 'occupied', label: 'Occupied' },
        { value: 'reserved', label: 'Reserved' }, { value: 'cleaning', label: 'Cleaning' },
      ]},
    ],
  },
  {
    id: 'pos', name: 'Waiter POS', icon: ShoppingBag, path: '/admin/pos',
    apiEndpoint: '/orders', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'qr', name: 'QR Ordering', icon: Smartphone, path: '/admin/qr-ordering',
    apiEndpoint: '/orders', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'menu-categories', name: 'Menu Categories', icon: ClipboardList, path: '/admin/menu-categories',
    apiEndpoint: '/menus/categories', phase: '1',
    fields: [
      { key: 'name', label: 'Category', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  {
    id: 'menu-items', name: 'Menu Items', icon: ChefHat, path: '/admin/menu-items',
    apiEndpoint: '/menus/items', phase: '1',
    fields: [
      { key: 'category_id', label: 'Category ID', type: 'text', required: true },
      { key: 'name', label: 'Item Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'price', label: 'Price', type: 'number', required: true },
      { key: 'is_veg', label: 'Vegetarian', type: 'checkbox' },
      { key: 'is_available', label: 'Available', type: 'checkbox' },
      { key: 'kitchen_station', label: 'Kitchen Station', type: 'text' },
    ],
  },
  {
    id: 'recipes', name: 'Recipes', icon: ChefHat, path: '/admin/recipes',
    apiEndpoint: '/menus/recipes', phase: '1',
    fields: [
      { key: 'menu_item_id', label: 'Menu Item ID', type: 'text', required: true },
      { key: 'name', label: 'Recipe Name', type: 'text', required: true },
      { key: 'yield_qty', label: 'Yield Qty', type: 'number' },
    ],
  },
  {
    id: 'kitchen', name: 'Kitchen KOT', icon: ChefHat, path: '/admin/kitchen',
    apiEndpoint: '/kot', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'billing', name: 'Billing & Payments', icon: CreditCard, path: '/admin/billing',
    apiEndpoint: '/payments', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'orders', name: 'Orders', icon: Receipt, path: '/admin/orders',
    apiEndpoint: '/orders', phase: '1', customPage: true, fields: [],
  },
  {
    id: 'delivery', name: 'Delivery & Dispatch', icon: Truck, path: '/admin/delivery',
    apiEndpoint: '/delivery', phase: '1',
    fields: [
      { key: 'order_id', label: 'Order ID', type: 'text', required: true },
      { key: 'delivery_status', label: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' }, { value: 'assigned', label: 'Assigned' },
        { value: 'picked_up', label: 'Picked Up' }, { value: 'delivered', label: 'Delivered' },
      ]},
    ],
  },
  {
    id: 'riders', name: 'Riders', icon: Truck, path: '/admin/riders',
    apiEndpoint: '/delivery/riders', phase: '1',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'text', required: true },
      { key: 'vehicle_type', label: 'Vehicle', type: 'text' },
      { key: 'is_available', label: 'Available', type: 'checkbox' },
    ],
  },
  {
    id: 'customers', name: 'Customers & Loyalty', icon: Gift, path: '/admin/customers',
    apiEndpoint: '/customers', phase: '2',
    fields: [
      { key: 'full_name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'loyalty_points', label: 'Points', type: 'number' },
      { key: 'tier', label: 'Tier', type: 'select', options: [
        { value: 'bronze', label: 'Bronze' }, { value: 'silver', label: 'Silver' }, { value: 'gold', label: 'Gold' },
      ]},
    ],
  },
  {
    id: 'loyalty', name: 'Loyalty Transactions', icon: Gift, path: '/admin/loyalty',
    apiEndpoint: '/loyalty', phase: '2',
    fields: [
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true },
      { key: 'points', label: 'Points', type: 'number', required: true },
      { key: 'transaction_type', label: 'Type', type: 'select', options: [
        { value: 'earn', label: 'Earn' }, { value: 'redeem', label: 'Redeem' },
      ]},
    ],
  },
  {
    id: 'coupons', name: 'Promotions & Coupons', icon: Percent, path: '/admin/coupons',
    apiEndpoint: '/coupons', phase: '2',
    fields: [
      { key: 'code', label: 'Coupon Code', type: 'text', required: true },
      { key: 'discount_type', label: 'Type', type: 'select', options: [
        { value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed' },
      ]},
      { key: 'discount_value', label: 'Value', type: 'number', required: true },
      { key: 'min_order_amount', label: 'Min Order', type: 'number' },
    ],
  },
  {
    id: 'inventory', name: 'Inventory', icon: Warehouse, path: '/admin/inventory',
    apiEndpoint: '/inventory', phase: '2',
    fields: [
      { key: 'name', label: 'Ingredient', type: 'text', required: true },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'current_stock', label: 'Current Stock', type: 'number' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'cost_per_unit', label: 'Cost/Unit', type: 'number' },
    ],
  },
  {
    id: 'stock-ledger', name: 'Stock Ledger', icon: Package, path: '/admin/stock-ledger',
    apiEndpoint: '/inventory/ledger', phase: '2',
    fields: [
      { key: 'ingredient_id', label: 'Ingredient ID', type: 'text', required: true },
      { key: 'movement_type', label: 'Type', type: 'select', options: [
        { value: 'in', label: 'In' }, { value: 'out', label: 'Out' }, { value: 'adjustment', label: 'Adjustment' },
      ]},
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'suppliers', name: 'Suppliers', icon: Store, path: '/admin/suppliers',
    apiEndpoint: '/suppliers', phase: '2',
    fields: [
      { key: 'name', label: 'Supplier', type: 'text', required: true },
      { key: 'contact_person', label: 'Contact', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    id: 'purchase-orders', name: 'Purchase Orders', icon: Package, path: '/admin/purchase-orders',
    apiEndpoint: '/suppliers/purchase-orders', phase: '2',
    fields: [
      { key: 'supplier_id', label: 'Supplier ID', type: 'text', required: true },
      { key: 'po_number', label: 'PO Number', type: 'text', required: true },
      { key: 'total_amount', label: 'Total', type: 'number' },
      { key: 'po_status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'received', label: 'Received' },
      ]},
    ],
  },
  {
    id: 'finance', name: 'Finance', icon: BarChart3, path: '/admin/finance',
    apiEndpoint: '/finance', phase: '2',
    fields: [
      { key: 'entry_type', label: 'Type', type: 'select', options: [
        { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' },
      ]},
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'day-close', name: 'Day Close', icon: Calendar, path: '/admin/day-close',
    apiEndpoint: '/finance/day-close', phase: '2',
    fields: [
      { key: 'close_date', label: 'Date', type: 'datetime', required: true },
      { key: 'total_sales', label: 'Total Sales', type: 'number' },
      { key: 'total_orders', label: 'Orders', type: 'number' },
      { key: 'cash_total', label: 'Cash', type: 'number' },
      { key: 'upi_total', label: 'UPI', type: 'number' },
      { key: 'card_total', label: 'Card', type: 'number' },
    ],
  },
  {
    id: 'reservations', name: 'Reservations', icon: Calendar, path: '/admin/reservations',
    apiEndpoint: '/reservations', phase: '2',
    fields: [
      { key: 'guest_name', label: 'Guest Name', type: 'text', required: true },
      { key: 'guest_phone', label: 'Phone', type: 'text' },
      { key: 'guest_count', label: 'Guests', type: 'number' },
      { key: 'reserved_at', label: 'Date/Time', type: 'datetime', required: true },
      { key: 'event_type', label: 'Event Type', type: 'text' },
    ],
  },
  {
    id: 'reports', name: 'Analytics', icon: BarChart3, path: '/admin/reports',
    apiEndpoint: '/reports', phase: '2', customPage: true, fields: [],
  },
  {
    id: 'cms', name: 'CMS & Content', icon: Globe, path: '/admin/cms',
    apiEndpoint: '/cms', phase: '2',
    fields: [
      { key: 'page_key', label: 'Page Key', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Content', type: 'textarea' },
      { key: 'is_published', label: 'Published', type: 'checkbox' },
    ],
  },
  {
    id: 'integrations', name: 'Integrations', icon: Settings, path: '/admin/integrations',
    apiEndpoint: '/integrations', phase: '2',
    fields: [
      { key: 'provider', label: 'Provider', type: 'text', required: true },
      { key: 'integration_type', label: 'Type', type: 'text', required: true },
      { key: 'is_enabled', label: 'Enabled', type: 'checkbox' },
    ],
  },
  {
    id: 'subscriptions', name: 'SaaS Billing', icon: Crown, path: '/admin/subscriptions',
    apiEndpoint: '/subscriptions/plans', phase: '3',
    fields: [
      { key: 'name', label: 'Plan Name', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'price_monthly', label: 'Monthly Price', type: 'number', required: true },
      { key: 'max_branches', label: 'Max Branches', type: 'number' },
    ],
  },
  {
    id: 'notifications', name: 'Notifications', icon: Globe, path: '/admin/notifications',
    apiEndpoint: '/notifications', phase: '2',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'message', label: 'Message', type: 'textarea', required: true },
      { key: 'channel', label: 'Channel', type: 'select', options: [
        { value: 'in_app', label: 'In-App' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' },
      ]},
    ],
  },
];

export function getModuleByPath(path: string) {
  return MODULES.find((m) => m.path === path);
}
