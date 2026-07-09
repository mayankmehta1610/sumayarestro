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

export async function customerRegister(payload: Record<string, unknown>) {
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
