import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDashboard } from '../api';
import LoadingView from '../components/LoadingView';
import { theme } from '../theme';
import { formatCurrency, shadows } from '../utils';

export default function DashboardScreen() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setData).finally(() => setLoading(false));
    const i = setInterval(() => getDashboard().then(setData), 30000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <LoadingView label="Loading dashboard..." />;

  const cards = [
    { label: "Today's sales", value: formatCurrency(Number(data?.today_sales || 0)), color: '#6366F1' },
    { label: 'Orders today', value: String(data?.today_orders || 0), color: '#F43F5E' },
    { label: 'Active tables', value: `${data?.active_tables || 0}/${data?.total_tables || 0}`, color: '#10B981' },
    { label: 'Kitchen queue', value: String(data?.pending_kots || 0), color: '#F59E0B' },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }}>
      <LinearGradient colors={['#312E81', '#4F46E5']} style={[styles.hero, shadows.md]}>
        <Text style={styles.heroLabel}>Branch overview</Text>
        <Text style={styles.heroTitle}>Operations at a glance</Text>
        <Text style={styles.heroSub}>Live metrics from your restaurant</Text>
      </LinearGradient>

      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={[styles.card, shadows.sm, { borderTopColor: c.color }]}>
            <Text style={styles.cardLabel}>{c.label}</Text>
            <Text style={[styles.cardValue, { color: c.color }]}>{c.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.panel, shadows.sm]}>
        <Text style={styles.panelTitle}>Quick insights</Text>
        <Text style={styles.line}>• Low stock items: {String(data?.low_stock_items || 0)}</Text>
        {((data?.top_items as Array<Record<string, unknown>>) || []).slice(0, 3).map((item, i) => (
          <Text key={i} style={styles.line}>• Top seller: {String(item.name)} ({String(item.quantity)} sold)</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  hero: { borderRadius: 20, padding: 24, marginBottom: 16 },
  heroLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#E0E7FF', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderTopWidth: 4 },
  cardLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '600' },
  cardValue: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 16 },
  panelTitle: { fontWeight: '800', fontSize: 16, marginBottom: 12, color: theme.colors.ink },
  line: { color: theme.colors.muted, marginBottom: 8, fontSize: 14 },
});
