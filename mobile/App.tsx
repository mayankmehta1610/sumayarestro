import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getStoredUser, logout } from './src/api';
import AppHeader from './src/components/AppHeader';
import TabBar from './src/components/TabBar';
import LoadingView from './src/components/LoadingView';
import LoginScreen from './src/screens/LoginScreen';
import TablesScreen from './src/screens/TablesScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import POSScreen from './src/screens/POSScreen';
import BillingScreen from './src/screens/BillingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import DeliveryScreen from './src/screens/DeliveryScreen';
import TrackScreen from './src/screens/TrackScreen';
import CustomerOrderScreen from './src/screens/CustomerOrderScreen';
import { Screen, ROLE_SCREENS, defaultScreen } from './src/navigation';
import { theme } from './src/theme';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [trackOrderId, setTrackOrderId] = useState('');
  const [posTableId, setPosTableId] = useState<string | undefined>();
  const [slug, setSlug] = useState('spice-garden');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then((u) => {
      if (u) {
        setUser(u);
        setScreen(defaultScreen(u.role as string));
        if (u.restaurant_slug) setSlug(String(u.restaurant_slug));
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setScreen('login');
    setPosTableId(undefined);
    setTrackOrderId('');
  };

  if (loading) return <LoadingView label="Starting Sumaya Resto..." />;

  if (!user) {
    return (
      <LoginScreen
        onLoggedIn={(u) => {
          setUser(u);
          setScreen(defaultScreen(u.role as string));
          if (u.restaurant_slug) setSlug(String(u.restaurant_slug));
        }}
      />
    );
  }

  const role = String(user.role);
  const tabs = ROLE_SCREENS[role] || ['orders'];
  const isCustomer = role === 'customer';
  const visibleTabs = isCustomer ? (['customer-order', 'track'] as Screen[]) : tabs;
  const showTabBar = screen !== 'track' && visibleTabs.length > 1;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen !== 'track' && (
        <AppHeader
          title={String(user.full_name || 'Staff')}
          subtitle={`${role.replace(/_/g, ' ')} · ${slug.replace(/-/g, ' ')}`}
          onLogout={handleLogout}
        />
      )}
      <View style={styles.body}>
        {screen === 'dashboard' && <DashboardScreen />}
        {screen === 'tables' && (
          <TablesScreen
            onOrder={(tableId) => {
              setPosTableId(tableId);
              setScreen('pos');
            }}
          />
        )}
        {screen === 'kitchen' && <KitchenScreen />}
        {screen === 'orders' && (
          <OrdersScreen
            onTrack={(id) => {
              setTrackOrderId(id);
              setScreen('track');
            }}
          />
        )}
        {screen === 'pos' && (
          <POSScreen
            tableId={posTableId}
            onPlaced={(id) => {
              setTrackOrderId(id);
              setScreen('track');
            }}
          />
        )}
        {screen === 'billing' && <BillingScreen />}
        {screen === 'inventory' && <InventoryScreen />}
        {screen === 'delivery' && <DeliveryScreen />}
        {screen === 'track' && (
          <TrackScreen
            orderId={trackOrderId}
            onBack={() => setScreen(role === 'customer' ? 'customer-order' : 'orders')}
          />
        )}
        {screen === 'customer-order' && (
          <CustomerOrderScreen
            slug={slug}
            onPlaced={(id) => {
              setTrackOrderId(id);
              setScreen('track');
            }}
          />
        )}
      </View>
      {showTabBar && (
        <TabBar
          tabs={visibleTabs}
          active={screen}
          onChange={(s) => {
            if (s === 'track' && !trackOrderId) return;
            setScreen(s);
            if (s !== 'pos') setPosTableId(undefined);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  body: { flex: 1 },
});
