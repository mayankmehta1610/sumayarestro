import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { listResource } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { formatCurrency, shadows, statusColor } from '../utils';

type Props = { onTrack: (id: string) => void };

export default function OrdersScreen({ onTrack }: Props) {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const d = await listResource('/orders', { page_size: 40 });
    setOrders(d.items || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 12000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <LoadingView label="Loading orders..." />;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={styles.heading}>Recent orders</Text>
      <Text style={styles.sub}>{orders.length} orders in this branch</Text>

      {orders.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Orders placed from POS or customer app appear here." />
      ) : (
        orders.map((o) => (
          <TouchableOpacity key={String(o.id)} style={[styles.card, shadows.sm]} onPress={() => onTrack(String(o.id))} activeOpacity={0.85}>
            <View style={styles.row}>
              <Text style={styles.num}>{String(o.order_number)}</Text>
              <Text style={[styles.amount, { color: statusColor(String(o.payment_status)) }]}>{formatCurrency(Number(o.net_amount))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>{String(o.order_type).replace(/_/g, ' ')}</Text>
              <Text style={[styles.badge, { color: statusColor(String(o.order_status)) }]}>{String(o.order_status)}</Text>
            </View>
            <Text style={styles.pay}>{String(o.payment_status)}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  heading: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  sub: { color: theme.colors.muted, marginBottom: 16, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { fontWeight: '800', fontSize: 16, color: theme.colors.ink },
  amount: { fontWeight: '800', fontSize: 16 },
  meta: { color: theme.colors.muted, textTransform: 'capitalize', marginTop: 8 },
  badge: { fontWeight: '700', textTransform: 'capitalize', marginTop: 8, fontSize: 13 },
  pay: { marginTop: 6, fontSize: 12, color: theme.colors.muted, textTransform: 'capitalize' },
});
