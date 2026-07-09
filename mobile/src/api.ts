import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE = Platform.select({
  android: 'http://10.0.2.2:8001/api/v1',
  ios: 'http://localhost:8001/api/v1',
  default: 'http://localhost:8001/api/v1',
});

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('sumaya_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  await AsyncStorage.setItem('sumaya_token', data.access_token);
  await AsyncStorage.setItem('sumaya_user', JSON.stringify(data.user));
  return data;
}

export async function restaurantLogin(email: string, password: string, restaurantSlug: string) {
  const { data } = await api.post('/auth/restaurant-login', { email, password, restaurant_slug: restaurantSlug });
  await AsyncStorage.setItem('sumaya_token', data.access_token);
  await AsyncStorage.setItem('sumaya_user', JSON.stringify(data.user));
  return data;
}

export async function customerLogin(email: string, password: string, restaurantSlug: string) {
  const { data } = await api.post('/customer/login', { email, password, restaurant_slug: restaurantSlug });
  await AsyncStorage.setItem('sumaya_token', data.access_token);
  await AsyncStorage.setItem('sumaya_user', JSON.stringify(data.user));
  return data;
}

export async function customerRegister(payload: Record<string, unknown>) {
  const { data } = await api.post('/customer/register', payload);
  await AsyncStorage.setItem('sumaya_token', data.access_token);
  await AsyncStorage.setItem('sumaya_user', JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await AsyncStorage.multiRemove(['sumaya_token', 'sumaya_user']);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem('sumaya_user');
  return raw ? JSON.parse(raw) : null;
}

export async function getTableFloor(branchId?: string) {
  const { data } = await api.get('/tables/floor', { params: branchId ? { branch_id: branchId } : {} });
  return data;
}

export async function markTableFree(tableId: string) {
  const { data } = await api.patch(`/tables/${tableId}/free`);
  return data;
}

export async function getKitchenQueue() {
  const { data } = await api.get('/kot/queue');
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

export async function getPublicRestaurant(slug: string) {
  const { data } = await api.get(`/auth/public/restaurant/${slug}`);
  return data;
}

export async function getPublicMenu(branchId: string) {
  const { data } = await api.get(`/public/menu/${branchId}`);
  return data;
}

export async function getDashboard() {
  const { data } = await api.get('/reports/dashboard');
  return data;
}
