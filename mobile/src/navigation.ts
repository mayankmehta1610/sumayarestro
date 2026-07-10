export type Screen =
  | 'login'
  | 'dashboard'
  | 'tables'
  | 'kitchen'
  | 'orders'
  | 'pos'
  | 'billing'
  | 'inventory'
  | 'delivery'
  | 'track'
  | 'customer-order';

export const ROLE_SCREENS: Record<string, Screen[]> = {
  waiter: ['tables', 'pos', 'orders', 'dashboard'],
  kitchen_staff: ['kitchen', 'orders'],
  cashier: ['billing', 'orders', 'tables'],
  branch_manager: ['dashboard', 'tables', 'kitchen', 'billing', 'orders'],
  restaurant_owner: ['dashboard', 'tables', 'kitchen', 'billing', 'inventory', 'orders'],
  inventory_manager: ['inventory', 'orders'],
  delivery_operator: ['delivery', 'orders'],
  supplier_manager: ['inventory', 'orders'],
  customer: ['customer-order', 'track'],
};

export const TAB_LABELS: Record<Screen, string> = {
  login: '',
  dashboard: 'Home',
  tables: 'Tables',
  kitchen: 'Kitchen',
  orders: 'Orders',
  pos: 'POS',
  billing: 'Billing',
  inventory: 'Stock',
  delivery: 'Delivery',
  track: 'Track',
  'customer-order': 'Menu',
};

export const TAB_ICONS: Record<Screen, string> = {
  login: 'log-in',
  dashboard: 'grid',
  tables: 'grid',
  kitchen: 'flame',
  orders: 'receipt',
  pos: 'cart',
  billing: 'card',
  inventory: 'cube',
  delivery: 'bicycle',
  track: 'navigate',
  'customer-order': 'restaurant',
};

export function defaultScreen(role: string): Screen {
  if (role === 'customer') return 'customer-order';
  if (role === 'kitchen_staff') return 'kitchen';
  if (role === 'cashier') return 'billing';
  if (role === 'inventory_manager' || role === 'supplier_manager') return 'inventory';
  if (role === 'delivery_operator') return 'delivery';
  if (role === 'restaurant_owner' || role === 'branch_manager') return 'dashboard';
  return 'tables';
}
