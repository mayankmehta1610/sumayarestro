import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PlatformLanding from './pages/PlatformLanding';
import RestaurantPortalPage from './pages/RestaurantPortalPage';
import RestaurantLoginPage from './pages/RestaurantLoginPage';
import BranchSelectPage from './pages/BranchSelectPage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import DashboardPage from './pages/DashboardPage';
import TableFloorPage from './pages/TableFloorPage';
import TableOrderPage from './pages/TableOrderPage';
import KitchenPage from './pages/KitchenPage';
import BillingPage from './pages/BillingPage';
import OrdersPage from './pages/OrdersPage';
import OrderTrackPage from './pages/OrderTrackPage';
import CustomerOrderPage from './pages/CustomerOrderPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import ModuleCrudPage from './pages/ModuleCrudPage';
import LoginPage from './pages/LoginPage';

const qc = new QueryClient();

function ProtectedRestaurant({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to={`/r/${slug}/login`} replace />;
  return <>{children}</>;
}

function RestaurantRoutes() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const defaultPath = user?.role === 'customer' ? 'order' :
    user?.role === 'kitchen_staff' ? 'kitchen' :
    user?.role === 'waiter' ? 'tables' : 'dashboard';

  return (
    <Layout>
      <Routes>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tables" element={<TableFloorPage />} />
        <Route path="tables/:tableId/order" element={<TableOrderPage />} />
        <Route path="kitchen" element={<KitchenPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId/track" element={<OrderTrackPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="order" element={<CustomerOrderPage />} />
        <Route path="my-orders" element={<CustomerOrdersPage />} />
        <Route path="menu" element={<ModuleCrudPage moduleId="menu" title="Menu Items" />} />
        <Route path="staff" element={<ModuleCrudPage moduleId="staff" title="Staff" />} />
        <Route path="branches" element={<ModuleCrudPage moduleId="branches" title="Branches" />} />
        <Route path="customers" element={<ModuleCrudPage moduleId="customers" title="Customers" />} />
        <Route path="coupons" element={<ModuleCrudPage moduleId="coupons" title="Coupons" />} />
        <Route path="inventory" element={<ModuleCrudPage moduleId="inventory" title="Inventory" />} />
        <Route path="suppliers" element={<ModuleCrudPage moduleId="suppliers" title="Suppliers" />} />
        <Route path="delivery" element={<ModuleCrudPage moduleId="delivery" title="Delivery" />} />
        <Route path="reservations" element={<ModuleCrudPage moduleId="reservations" title="Reservations" />} />
        <Route path="reports" element={<DashboardPage />} />
        <Route path="finance" element={<ModuleCrudPage moduleId="finance" title="Finance" />} />
        <Route path="cms" element={<ModuleCrudPage moduleId="cms" title="CMS" />} />
        <Route path="tenants" element={<ModuleCrudPage moduleId="tenants" title="Tenants" />} />
        <Route path="integrations" element={<ModuleCrudPage moduleId="integrations" title="Integrations" />} />
        <Route path="audit" element={<ModuleCrudPage moduleId="audit" title="Audit Log" />} />
        <Route path="*" element={<Navigate to={`/r/${slug}/${defaultPath}`} replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PlatformLanding />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/r/:slug" element={<RestaurantPortalPage />} />
            <Route path="/r/:slug/login" element={<RestaurantLoginPage />} />
            <Route path="/r/:slug/customer/login" element={<CustomerLoginPage />} />
            <Route path="/r/:slug/select-branch" element={
              <ProtectedRestaurant><BranchSelectPage /></ProtectedRestaurant>
            } />
            <Route path="/r/:slug/*" element={
              <ProtectedRestaurant><RestaurantRoutes /></ProtectedRestaurant>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
