import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as apiLogin, restaurantLogin, setBranch as apiSetBranch, getMe } from '../lib/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  restaurant_id: string | null;
  branch_id: string | null;
  restaurant_slug?: string | null;
  modules?: string[];
  branches?: { id: string; name: string; city: string; code: string }[];
  needs_branch_selection?: boolean;
}

interface CustomerRegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  restaurant_slug?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, restaurantSlug?: string) => Promise<User>;
  customerLogin: (email: string, password: string, restaurantSlug: string) => Promise<User>;
  customerRegister: (payload: CustomerRegisterPayload) => Promise<User>;
  logout: () => void;
  setBranch: (branchId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await getMe();
      setUser(data);
      localStorage.setItem('sumaya_user', JSON.stringify(data));
    } catch { /* not logged in */ }
  };

  useEffect(() => {
    const stored = localStorage.getItem('sumaya_user');
    const token = localStorage.getItem('sumaya_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      refreshUser();
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, restaurantSlug?: string) => {
    const data = restaurantSlug
      ? await restaurantLogin(email, password, restaurantSlug)
      : await apiLogin(email, password);
    localStorage.setItem('sumaya_token', data.access_token);
    localStorage.setItem('sumaya_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const customerLogin = async (email: string, password: string, restaurantSlug: string) => {
    const { customerLogin: cl } = await import('../lib/api');
    const data = await cl(email, password, restaurantSlug);
    localStorage.setItem('sumaya_token', data.access_token);
    localStorage.setItem('sumaya_user', JSON.stringify({ ...data.user, restaurant_slug: restaurantSlug }));
    setUser({ ...data.user, restaurant_slug: restaurantSlug });
    return data.user;
  };

  const customerRegister = async (payload: CustomerRegisterPayload) => {
    const { customerRegister: cr } = await import('../lib/api');
    const data = await cr(payload);
    const slug = payload.restaurant_slug || null;
    const user = { ...data.user, restaurant_slug: slug };
    localStorage.setItem('sumaya_token', data.access_token);
    localStorage.setItem('sumaya_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('sumaya_token');
    localStorage.removeItem('sumaya_user');
    localStorage.removeItem('sumaya_branch');
    setUser(null);
  };

  const setBranch = async (branchId: string) => {
    await apiSetBranch(branchId);
    localStorage.setItem('sumaya_branch', branchId);
    if (user) {
      const updated = { ...user, branch_id: branchId, needs_branch_selection: false };
      setUser(updated);
      localStorage.setItem('sumaya_user', JSON.stringify(updated));
    }
    await refreshUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, customerLogin, customerRegister, logout, setBranch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
