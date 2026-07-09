import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sumaya_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const path = window.location.pathname;
    if (err.response?.status === 401 && !path.includes('/login')) {
      localStorage.removeItem('sumaya_token');
      localStorage.removeItem('sumaya_user');
      if (path.startsWith('/r/')) {
        const slug = path.split('/')[2];
        window.location.href = `/r/${slug}/login`;
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function restaurantLogin(email: string, password: string, restaurantSlug: string) {
  const { data } = await api.post('/auth/restaurant-login', { email, password, restaurant_slug: restaurantSlug });
  return data;
}

export async function customerRegister(payload: { full_name: string; email: string; phone: string; password: string; restaurant_slug?: string }) {
  const { data } = await api.post('/customer/register', payload);
  localStorage.setItem('sumaya_token', data.access_token);
  localStorage.setItem('sumaya_user', JSON.stringify(data.user));
  return data;
}

export async function customerLogin(email: string, password: string, restaurantSlug: string) {
  const { data } = await api.post('/customer/login', { email, password, restaurant_slug: restaurantSlug });
  return data;
}

export async function setBranch(branchId: string) {
  const { data } = await api.post('/auth/set-branch', { branch_id: branchId });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getDashboard() {
  const { data } = await api.get('/reports/dashboard');
  return data;
}

export async function getTableFloor(branchId?: string) {
  const { data } = await api.get('/tables/floor', { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function markTableFree(tableId: string) {
  const { data } = await api.patch(`/tables/${tableId}/free`);
  return data;
}

export async function markTableOccupied(tableId: string) {
  const { data } = await api.patch(`/tables/${tableId}/occupy`);
  return data;
}

export async function getKitchenQueue(branchId?: string) {
  const { data } = await api.get('/kot/queue', { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function advanceKot(kotId: string) {
  const { data } = await api.patch(`/kot/advance/${kotId}`);
  return data;
}

export async function listResource(endpoint: string, params?: Record<string, unknown>) {
  const { data } = await api.get(`${endpoint}/list`, { params });
  return data;
}

export async function createResource(endpoint: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${endpoint}/create`, payload);
  return data;
}

export async function updateResource(endpoint: string, id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${endpoint}/update/${id}`, payload);
  return data;
}

export async function updateStatus(endpoint: string, id: string, status: string) {
  const { data } = await api.patch(`${endpoint}/status/${id}`, { status });
  return data;
}

export async function getPublicRestaurant(slug: string) {
  const { data } = await api.get(`/auth/public/restaurant/${slug}`);
  return data;
}

export async function getPublicMenu(branchId: string) {
  const { data } = await api.get(`/public/menu/${branchId}`);
  return data;
}

export async function createOrder(payload: Record<string, unknown>) {
  const { data } = await api.post('/orders/create', payload);
  return data;
}

export async function customerPlaceOrder(payload: Record<string, unknown>) {
  const { data } = await api.post('/customer/order', payload);
  return data;
}

export async function trackOrder(orderId: string) {
  const { data } = await api.get(`/orders/track/${orderId}`);
  return data;
}

export async function getCustomerOrders() {
  const { data } = await api.get('/customer/orders');
  return data;
}

export async function exportResource(endpoint: string) {
  const { data } = await api.get(`${endpoint}/export`);
  return data;
}

export async function createPayment(payload: Record<string, unknown>) {
  const { data } = await api.post('/payments/create', payload);
  return data;
}

export async function updateOrderStatus(orderId: string, order_status: string) {
  const { data } = await api.patch(`/orders/status/${orderId}`, { order_status });
  return data;
}

export async function getMyNotifications(unreadOnly = false) {
  const { data } = await api.get('/notifications/mine', { params: { unread_only: unreadOnly } });
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data;
}

export async function markNotificationsRead(ids?: string[]) {
  const { data } = await api.patch('/notifications/mark-read', { notification_ids: ids });
  return data;
}

export async function getWaitlistQueue(branchId?: string) {
  const { data } = await api.get('/waitlist/queue', { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function joinWaitlist(payload: Record<string, unknown>) {
  const { data } = await api.post('/waitlist/join', payload);
  return data;
}

export async function callNextGuest(branchId?: string) {
  const { data } = await api.patch('/waitlist/call-next', null, { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function seatWaitlistGuest(entryId: string, tableId: string) {
  const { data } = await api.patch(`/waitlist/${entryId}/seat`, { table_id: tableId });
  return data;
}

export async function checkQueueStatus(queueNumber: number, branchId: string) {
  const { data } = await api.get(`/waitlist/status/${queueNumber}`, { params: { branch_id: branchId } });
  return data;
}

export async function getTodayReservations(branchId?: string) {
  const { data } = await api.get('/reservations/today', { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function bookReservation(payload: Record<string, unknown>) {
  const { data } = await api.post('/reservations/book', payload);
  return data;
}

export async function checkInReservation(reservationId: string, tableId?: string) {
  const { data } = await api.patch(`/reservations/${reservationId}/check-in`, null, { params: tableId ? { table_id: tableId } : {} });
  return data;
}

export async function cancelReservation(reservationId: string) {
  const { data } = await api.patch(`/reservations/${reservationId}/cancel`);
  return data;
}
