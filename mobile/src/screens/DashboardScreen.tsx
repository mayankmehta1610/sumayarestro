import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { getDashboard, getStoredUser } from '../api';

export default function DashboardScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [dash, u] = await Promise.all([getDashboard(), getStoredUser()]);
    setStats(dash);
    setUser(u);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const cards = [
    { label: "Today's Sales", value: `₹${Number(stats?.today_sales || 0).toLocaleString()}`, color: theme.colors.amber },
    { label: 'Orders', value: String(stats?.today_orders || 0), color: theme.colors.chili },
    { label: 'Tables', value: `${stats?.active_tables}/${stats?.total_tables}`, color: theme.colors.coffee },
    { label: 'Pending KOTs', value: String(stats?.pending_kots || 0), color: '#EA580C' },
  ];

  const quickActions = [
    { id: 'pos', label: 'POS', icon: '🛒' },
    { id: 'kitchen', label: 'Kitchen', icon: '👨‍🍳' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'menu', label: 'Menu', icon: '🍽️' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {String(user?.full_name || 'Staff')}</Text>
        <Text style={styles.role}>{String(user?.role || '').replace(/_/g, ' ')}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={[styles.card, { borderLeftColor: c.color }]}>
            <Text style={styles.cardLabel}>{c.label}</Text>
            <Text style={styles.cardValue}>{c.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        {quickActions.map((a) => (
          <TouchableOpacity key={a.id} style={styles.actionBtn} onPress={() => onNavigate(a.id)}>
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {(stats?.recent_orders as Array<Record<string, unknown>> || []).map((o) => (
        <View key={String(o.id)} style={styles.orderRow}>
          <Text style={styles.orderNum}>{String(o.order_number)}</Text>
          <Text style={styles.orderAmt}>₹{Number(o.net_amount).toFixed(0)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { backgroundColor: theme.colors.espresso, padding: 24, paddingTop: 48 },
  greeting: { color: theme.colors.cream, fontSize: 24, fontWeight: 'bold' },
  role: { color: theme.colors.gray, textTransform: 'capitalize', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, marginTop: -20 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: '1.5%', borderLeftWidth: 4, elevation: 2 },
  cardLabel: { color: theme.colors.gray, fontSize: 12 },
  cardValue: { color: theme.colors.espresso, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.espresso, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  actions: { flexDirection: 'row', paddingHorizontal: 12 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 4, alignItems: 'center', elevation: 1 },
  actionIcon: { fontSize: 28 },
  actionLabel: { color: theme.colors.coffee, fontWeight: '600', marginTop: 4, fontSize: 12 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12 },
  orderNum: { fontWeight: '600', color: theme.colors.espresso },
  orderAmt: { fontWeight: '700', color: theme.colors.chili },
});
