import {
  LayoutDashboard, Utensils, ChefHat, Receipt, CreditCard, Users, MapPin,
  ClipboardList, Warehouse, Truck, Percent, Gift, BarChart3, Globe, Crown,
  ShoppingBag, Package, Calendar, Settings, Shield,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  path: string; // relative to /r/:slug
  roles: string[];
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  restaurant_owner: 'Restaurant Owner',
  branch_manager: 'Branch Manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
  kitchen_staff: 'Kitchen Staff',
  inventory_manager: 'Inventory Manager',
  supplier_manager: 'Supplier Manager',
  delivery_operator: 'Delivery Operator',
  customer: 'Customer',
  support_admin: 'Support Admin',
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: 'dashboard', roles: ['super_admin', 'restaurant_owner', 'branch_manager', 'cashier', 'waiter', 'inventory_manager', 'supplier_manager', 'delivery_operator', 'support_admin'] },
  { id: 'tables', label: 'Table Floor', icon: Utensils, path: 'tables', roles: ['restaurant_owner', 'branch_manager', 'cashier', 'waiter'] },
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat, path: 'kitchen', roles: ['kitchen_staff', 'branch_manager', 'restaurant_owner'] },
  { id: 'orders', label: 'Orders', icon: Receipt, path: 'orders', roles: ['restaurant_owner', 'branch_manager', 'cashier', 'waiter', 'kitchen_staff', 'delivery_operator'] },
  { id: 'billing', label: 'Billing', icon: CreditCard, path: 'billing', roles: ['cashier', 'branch_manager', 'restaurant_owner'] },
  { id: 'menu', label: 'Menu', icon: ClipboardList, path: 'menu', roles: ['restaurant_owner', 'branch_manager'] },
  { id: 'staff', label: 'Staff', icon: Users, path: 'staff', roles: ['restaurant_owner', 'branch_manager'] },
  { id: 'branches', label: 'Branches', icon: MapPin, path: 'branches', roles: ['restaurant_owner', 'super_admin'] },
  { id: 'customers', label: 'Customers', icon: Gift, path: 'customers', roles: ['restaurant_owner', 'branch_manager'] },
  { id: 'coupons', label: 'Coupons', icon: Percent, path: 'coupons', roles: ['restaurant_owner', 'branch_manager'] },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: 'inventory', roles: ['inventory_manager', 'branch_manager', 'restaurant_owner'] },
  { id: 'suppliers', label: 'Suppliers', icon: Package, path: 'suppliers', roles: ['supplier_manager', 'inventory_manager', 'restaurant_owner'] },
  { id: 'delivery', label: 'Delivery', icon: Truck, path: 'delivery', roles: ['delivery_operator', 'branch_manager', 'restaurant_owner'] },
  { id: 'waitlist', label: 'Waitlist', icon: Users, path: 'waitlist', roles: ['restaurant_owner', 'branch_manager', 'waiter'] },
  { id: 'reservations', label: 'Reservations', icon: Calendar, path: 'reservations', roles: ['branch_manager', 'restaurant_owner', 'waiter'] },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: 'reports', roles: ['restaurant_owner', 'branch_manager'] },
  { id: 'finance', label: 'Finance', icon: BarChart3, path: 'finance', roles: ['restaurant_owner', 'branch_manager', 'cashier'] },
  { id: 'cms', label: 'CMS', icon: Globe, path: 'cms', roles: ['restaurant_owner'] },
  { id: 'platform-dashboard', label: 'Platform', icon: Crown, path: 'platform-dashboard', roles: ['super_admin'] },
  { id: 'tenants', label: 'Tenants', icon: Crown, path: 'tenants', roles: ['super_admin'] },
  { id: 'integrations', label: 'Integrations', icon: Settings, path: 'integrations', roles: ['restaurant_owner', 'super_admin'] },
  { id: 'audit', label: 'Audit', icon: Shield, path: 'audit', roles: ['super_admin', 'support_admin'] },
  { id: 'order-online', label: 'Order Food', icon: ShoppingBag, path: 'order', roles: ['customer'] },
  { id: 'my-orders', label: 'My Orders', icon: Receipt, path: 'my-orders', roles: ['customer'] },
  { id: 'book-table', label: 'Book Table', icon: Calendar, path: 'book-table', roles: ['customer'] },
  { id: 'join-queue', label: 'Join Queue', icon: Users, path: 'queue', roles: ['customer'] },
];

export function getNavForRole(role: string): NavItem[] {
  if (role === 'super_admin') return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const DEMO_LOGINS: Record<string, { email: string; password: string; role: string }[]> = {
  'spice-garden': [
    { email: 'owner@spice-garden.com', password: 'Sumaya@123', role: 'Restaurant Owner' },
    { email: 'manager@spice-garden.com', password: 'Sumaya@123', role: 'Branch Manager' },
    { email: 'waiter@spice-garden.com', password: 'Sumaya@123', role: 'Waiter' },
    { email: 'kitchen@spice-garden.com', password: 'Sumaya@123', role: 'Kitchen Staff' },
    { email: 'cashier@spice-garden.com', password: 'Sumaya@123', role: 'Cashier' },
    { email: 'inventory@spice-garden.com', password: 'Sumaya@123', role: 'Inventory Manager' },
    { email: 'delivery@spice-garden.com', password: 'Sumaya@123', role: 'Delivery Operator' },
    { email: 'customer@spice-garden.com', password: 'Sumaya@123', role: 'Customer' },
  ],
  'urban-bowl': [
    { email: 'owner@urban-bowl.com', password: 'Sumaya@123', role: 'Restaurant Owner' },
    { email: 'waiter@urban-bowl.com', password: 'Sumaya@123', role: 'Waiter' },
    { email: 'kitchen@urban-bowl.com', password: 'Sumaya@123', role: 'Kitchen Staff' },
    { email: 'customer@urban-bowl.com', password: 'Sumaya@123', role: 'Customer' },
  ],
  'coastal-curry': [
    { email: 'owner@coastal-curry.com', password: 'Sumaya@123', role: 'Restaurant Owner' },
    { email: 'waiter@coastal-curry.com', password: 'Sumaya@123', role: 'Waiter' },
    { email: 'kitchen@coastal-curry.com', password: 'Sumaya@123', role: 'Kitchen Staff' },
    { email: 'customer@coastal-curry.com', password: 'Sumaya@123', role: 'Customer' },
  ],
  platform: [
    { email: 'admin@sumayaresto.com', password: 'Sumaya@123', role: 'Super Admin' },
  ],
};

// API endpoint mapping for CRUD modules
export const CRUD_MODULES: Record<string, { apiEndpoint: string; fields: { key: string; label: string; type: string; required?: boolean; options?: { value: string; label: string }[] }[] }> = {
  staff: { apiEndpoint: '/staff', fields: [
    { key: 'full_name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Password', type: 'text', required: true },
    { key: 'role', label: 'Role', type: 'select', required: true, options: [
      { value: 'branch_manager', label: 'Manager' }, { value: 'waiter', label: 'Waiter' },
      { value: 'kitchen_staff', label: 'Kitchen' }, { value: 'cashier', label: 'Cashier' },
    ]},
  ]},
  branches: { apiEndpoint: '/branches', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
  ]},
  menu: { apiEndpoint: '/menus/items', fields: [
    { key: 'category_id', label: 'Category ID', type: 'text', required: true },
    { key: 'name', label: 'Item', type: 'text', required: true },
    { key: 'price', label: 'Price', type: 'number', required: true },
    { key: 'is_veg', label: 'Veg', type: 'checkbox' },
    { key: 'is_available', label: 'Available', type: 'checkbox' },
  ]},
  customers: { apiEndpoint: '/customers', fields: [
    { key: 'full_name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ]},
  coupons: { apiEndpoint: '/coupons', fields: [
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'discount_value', label: 'Discount %', type: 'number', required: true },
  ]},
  inventory: { apiEndpoint: '/inventory', fields: [
    { key: 'name', label: 'Ingredient', type: 'text', required: true },
    { key: 'current_stock', label: 'Stock', type: 'number' },
    { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
  ]},
  suppliers: { apiEndpoint: '/suppliers', fields: [
    { key: 'name', label: 'Supplier', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
  ]},
  delivery: { apiEndpoint: '/delivery', fields: [
    { key: 'order_id', label: 'Order ID', type: 'text', required: true },
    { key: 'delivery_status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' }, { value: 'delivered', label: 'Delivered' },
    ]},
  ]},
  reservations: { apiEndpoint: '/reservations', fields: [
    { key: 'guest_name', label: 'Guest', type: 'text', required: true },
    { key: 'guest_count', label: 'Guests', type: 'number' },
    { key: 'reserved_at', label: 'Date/Time', type: 'datetime', required: true },
  ]},
  finance: { apiEndpoint: '/finance', fields: [
    { key: 'entry_type', label: 'Type', type: 'select', options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] },
    { key: 'category', label: 'Category', type: 'text', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
  ]},
  cms: { apiEndpoint: '/cms', fields: [
    { key: 'page_key', label: 'Page Key', type: 'text', required: true },
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'body', label: 'Content', type: 'textarea' },
  ]},
  tenants: { apiEndpoint: '/tenants', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true },
  ]},
  integrations: { apiEndpoint: '/integrations', fields: [
    { key: 'provider', label: 'Provider', type: 'text', required: true },
    { key: 'integration_type', label: 'Type', type: 'text', required: true },
  ]},
  audit: { apiEndpoint: '/audit', fields: [] },
};
