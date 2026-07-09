import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from './src/theme';
import { login, restaurantLogin, customerLogin, customerRegister, getStoredUser, logout, getTableFloor, markTableFree, getKitchenQueue, advanceKot, listResource, createOrder, customerPlaceOrder, trackOrder, getPublicRestaurant, getPublicMenu } from './src/api';

type Screen = 'login' | 'tables' | 'kitchen' | 'orders' | 'pos' | 'track' | 'customer-order' | 'customer-login';

const ROLE_SCREENS: Record<string, Screen[]> = {
  waiter: ['tables', 'pos', 'orders'],
  kitchen_staff: ['kitchen', 'orders'],
  cashier: ['tables', 'orders', 'pos'],
  branch_manager: ['tables', 'kitchen', 'orders', 'pos'],
  restaurant_owner: ['tables', 'kitchen', 'orders', 'pos'],
  customer: ['customer-order', 'orders'],
};

const RESTAURANTS = ['spice-garden', 'urban-bowl', 'coastal-curry'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [slug, setSlug] = useState('spice-garden');
  const [email, setEmail] = useState('waiter@spice-garden.com');
  const [password, setPassword] = useState('Sumaya@123');
  const [trackOrderId, setTrackOrderId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then((u) => { if (u) { setUser(u); setScreen(defaultScreen(u.role as string)); } setLoading(false); });
  }, []);

  const defaultScreen = (role: string): Screen => {
    if (role === 'customer') return 'customer-order';
    if (role === 'kitchen_staff') return 'kitchen';
    if (role === 'waiter' || role === 'cashier') return 'tables';
    return 'tables';
  };

  const handleLogin = async () => {
    try {
      const data = await restaurantLogin(email, password, slug);
      setUser(data.user);
      setScreen(defaultScreen(data.user.role));
    } catch { Alert.alert('Error', 'Login failed'); }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setScreen('login');
  };

  if (loading) return <View style={s.center}><Text>Loading...</Text></View>;

  if (screen === 'login' || !user) {
    return (
      <SafeAreaView style={s.flex}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={s.loginWrap}>
          <Text style={s.logo}>Sumaya Resto</Text>
          <Text style={s.sub}>Mobile — Internal Restaurant App</Text>
          <Text style={s.label}>Restaurant</Text>
          <ScrollView horizontal style={{ marginBottom: 12 }}>
            {RESTAURANTS.map((r) => (
              <TouchableOpacity key={r} onPress={() => setSlug(r)} style={[s.chip, slug === r && s.chipActive]}>
                <Text style={slug === r ? s.chipTextActive : s.chipText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          <TouchableOpacity style={s.btn} onPress={handleLogin}><Text style={s.btnText}>Staff Login</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => { setEmail(`customer@${slug}.com`); handleLogin(); }}>
            <Text style={s.btnOutlineText}>Customer Demo Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnOutline, { marginTop: 8 }]} onPress={async () => {
            const em = `mobile.${Date.now()}@${slug}.com`;
            try {
              const data = await customerRegister({ full_name: 'Mobile Guest', email: em, phone: '+91 99999 00000', password: 'Sumaya@123', restaurant_slug: slug });
              setUser(data.user);
              setScreen('customer-order');
            } catch { Alert.alert('Register', 'Registration failed — try demo login'); }
          }}>
            <Text style={s.btnOutlineText}>Register as Customer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tabs = ROLE_SCREENS[user.role as string] || ['tables'];
  const tabLabels: Record<Screen, string> = { login: '', tables: 'Tables', kitchen: 'Kitchen', orders: 'Orders', pos: 'POS', track: 'Track', 'customer-order': 'Order', 'customer-login': '' };

  return (
    <SafeAreaView style={s.flex}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text style={s.headerTitle}>{String(user.full_name)} · {String(user.role).replace(/_/g, ' ')}</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={s.logout}>Logout</Text></TouchableOpacity>
      </View>
      <View style={s.flex}>
        {screen === 'tables' && <TablesScreen onOrder={(tableId) => { setScreen('pos'); }} />}
        {screen === 'kitchen' && <KitchenScreen />}
        {screen === 'orders' && <OrdersScreen onTrack={(id) => { setTrackOrderId(id); setScreen('track'); }} />}
        {screen === 'pos' && <POSScreen onPlaced={(id) => { setTrackOrderId(id); setScreen('track'); }} />}
        {screen === 'track' && <TrackScreen orderId={trackOrderId} onBack={() => setScreen('orders')} />}
        {screen === 'customer-order' && <CustomerOrderScreen slug={slug} onPlaced={(id) => { setTrackOrderId(id); setScreen('track'); }} />}
      </View>
      <View style={s.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity key={t} style={s.tab} onPress={() => setScreen(t)}>
            <Text style={[s.tabText, screen === t && s.tabActive]}>{tabLabels[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function TablesScreen({ onOrder }: { onOrder: (id: string) => void }) {
  const [tables, setTables] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getTableFloor().then((d) => setTables(d.items || [])); const i = setInterval(() => getTableFloor().then((d) => setTables(d.items || [])), 8000); return () => clearInterval(i); }, []);
  return (
    <ScrollView style={s.flex} contentContainerStyle={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tables.map((t) => (
        <View key={String(t.id)} style={[s.tableCard, t.table_status === 'occupied' ? s.occupied : s.available]}>
          <Text style={s.tableNum}>T{String(t.table_number)}</Text>
          <Text style={s.tableStatus}>{String(t.table_status)}</Text>
          {t.table_status === 'occupied' ? (
            <>
              <TouchableOpacity style={s.smallBtn} onPress={() => onOrder(String(t.id))}><Text style={s.smallBtnText}>View Order</Text></TouchableOpacity>
              <TouchableOpacity style={s.smallBtnOutline} onPress={() => markTableFree(String(t.id)).then(() => getTableFloor().then((d) => setTables(d.items || [])))}>
                <Text style={s.smallBtnOutlineText}>Mark Free</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.smallBtn} onPress={() => onOrder(String(t.id))}><Text style={s.smallBtnText}>Take Order</Text></TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function KitchenScreen() {
  const [kots, setKots] = useState<Array<Record<string, unknown>>>([]);
  const load = () => getKitchenQueue().then((d) => setKots(d.items || []));
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.espresso, padding: 12 }}>
      {kots.map((k) => (
        <View key={String(k.id)} style={s.kotCard}>
          <Text style={s.kotNum}>{String(k.kot_number)}</Text>
          <Text style={s.kotMeta}>Table {String(k.table_number || '—')} · {String(k.kot_status)}</Text>
          <TouchableOpacity style={s.btn} onPress={() => advanceKot(String(k.id)).then(load)}><Text style={s.btnText}>Advance</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function OrdersScreen({ onTrack }: { onTrack: (id: string) => void }) {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listResource('/orders', { page_size: 30 }).then((d) => setOrders(d.items || [])); }, []);
  return (
    <ScrollView style={{ padding: 12 }}>
      {orders.map((o) => (
        <TouchableOpacity key={String(o.id)} style={s.orderCard} onPress={() => onTrack(String(o.id))}>
          <Text style={s.orderNum}>{String(o.order_number)}</Text>
          <Text>₹{Number(o.net_amount).toFixed(0)} · {String(o.order_status)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function POSScreen({ onPlaced }: { onPlaced: (id: string) => void }) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [cart, setCart] = useState<Array<{ id: string; qty: number }>>([]);
  useEffect(() => { listResource('/menus/items', { page_size: 50 }).then((d) => setItems(d.items || [])); }, []);
  const place = async () => {
    const r = await createOrder({ order_type: 'dine_in', lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })) });
    onPlaced(r.id);
  };
  return (
    <ScrollView style={{ padding: 12 }}>
      {items.filter((i) => i.is_available).map((item) => (
        <TouchableOpacity key={String(item.id)} style={s.orderCard} onPress={() => setCart((p) => { const ex = p.find((c) => c.id === String(item.id)); return ex ? p.map((c) => c.id === String(item.id) ? { ...c, qty: c.qty + 1 } : c) : [...p, { id: String(item.id), qty: 1 }]; })}>
          <Text>{String(item.name)} — ₹{Number(item.price)}</Text>
        </TouchableOpacity>
      ))}
      {cart.length > 0 && <TouchableOpacity style={s.btn} onPress={place}><Text style={s.btnText}>Place Order ({cart.length} items)</Text></TouchableOpacity>}
    </ScrollView>
  );
}

function TrackScreen({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { if (orderId) trackOrder(orderId).then(setData); const i = setInterval(() => trackOrder(orderId).then(setData), 5000); return () => clearInterval(i); }, [orderId]);
  return (
    <ScrollView style={{ padding: 16 }}>
      <TouchableOpacity onPress={onBack}><Text style={{ color: theme.colors.chili }}>← Back</Text></TouchableOpacity>
      <Text style={s.orderNum}>{String(data?.order_number)}</Text>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.chili }}>₹{Number(data?.net_amount || 0).toFixed(2)}</Text>
      <Text style={{ marginVertical: 8, textTransform: 'capitalize' }}>Status: {String(data?.order_status)}</Text>
      {(data?.timeline as Array<Record<string, unknown>> || []).map((step) => (
        <View key={String(step.step)} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
          <Text>{step.done ? '✅' : step.current ? '⏳' : '⬜'}</Text>
          <Text style={{ marginLeft: 8, fontWeight: step.current ? 'bold' : 'normal' }}>{String(step.label)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function CustomerOrderScreen({ slug, onPlaced }: { slug: string; onPlaced: (id: string) => void }) {
  const [menu, setMenu] = useState<Record<string, unknown> | null>(null);
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [branchId, setBranchId] = useState('');
  useEffect(() => { getPublicRestaurant(slug).then(async (r) => { const bid = r.branches[0].id; setBranchId(bid); setMenu(await getPublicMenu(bid)); }); }, [slug]);
  const place = async () => {
    const r = await customerPlaceOrder({ order_type: 'takeaway', branch_id: branchId, lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })) });
    onPlaced(r.id);
  };
  const cats = (menu?.categories as Array<Record<string, unknown>>) || [];
  return (
    <ScrollView style={{ padding: 12 }}>
      {cats.map((cat) => (
        <View key={String(cat.id)}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginVertical: 8 }}>{String(cat.name)}</Text>
          {((cat.items as Array<Record<string, unknown>>) || []).map((item) => (
            <TouchableOpacity key={String(item.id)} style={s.orderCard} onPress={() => setCart((p) => { const ex = p.find((c) => c.id === String(item.id)); if (ex) return p.map((c) => c.id === String(item.id) ? { ...c, qty: c.qty + 1 } : c); return [...p, { id: String(item.id), name: String(item.name), price: Number(item.price), qty: 1 }]; })}>
              <Text>{String(item.name)} — ₹{Number(item.price)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {cart.length > 0 && <TouchableOpacity style={s.btn} onPress={place}><Text style={s.btnText}>Order ({cart.length} items)</Text></TouchableOpacity>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginWrap: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 28, fontWeight: 'bold', color: theme.colors.espresso },
  sub: { color: theme.colors.gray, marginBottom: 24 },
  label: { fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  btn: { backgroundColor: theme.colors.chili, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 2, borderColor: theme.colors.chili, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  btnOutlineText: { color: theme.colors.chili, fontWeight: '600' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  chipActive: { backgroundColor: theme.colors.chili },
  chipText: { color: theme.colors.coffee },
  chipTextActive: { color: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: theme.colors.espresso },
  headerTitle: { color: theme.colors.cream, fontWeight: '600', fontSize: 13 },
  logout: { color: theme.colors.amber },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 12, color: theme.colors.gray },
  tabActive: { color: theme.colors.chili, fontWeight: '700' },
  tableCard: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 2 },
  available: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  occupied: { borderColor: theme.colors.chili, backgroundColor: '#FEF2F2' },
  tableNum: { fontSize: 28, fontWeight: 'bold' },
  tableStatus: { textTransform: 'capitalize', marginVertical: 4 },
  smallBtn: { backgroundColor: theme.colors.chili, borderRadius: 8, padding: 8, marginTop: 4, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  smallBtnOutline: { borderWidth: 1, borderColor: theme.colors.coffee, borderRadius: 8, padding: 8, marginTop: 4, alignItems: 'center' },
  smallBtnOutlineText: { color: theme.colors.coffee, fontSize: 12 },
  kotCard: { backgroundColor: '#292524', borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: theme.colors.amber },
  kotNum: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  kotMeta: { color: theme.colors.gray, marginVertical: 4 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  orderNum: { fontWeight: 'bold', fontSize: 16 },
});
