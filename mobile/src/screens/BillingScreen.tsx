import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { applyCoupon, listResource, payBill } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { formatCurrency, shadows, statusColor } from '../utils';

export default function BillingScreen() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [method, setMethod] = useState('cash');
  const [coupon, setCoupon] = useState('SPICE10');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    const d = await listResource('/orders', { page_size: 50 });
    const unpaid = (d.items || []).filter((o: Record<string, unknown>) => o.payment_status !== 'paid');
    setOrders(unpaid);
    setLoading(false);
  };

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

  const selectOrder = async (o: Record<string, unknown>) => {
    setSelected(o);
    setPreview(null);
    try {
      const data = await applyCoupon(String(o.id), coupon);
      setPreview(data.bill || data);
    } catch {
      setPreview({ net_amount: o.net_amount });
    }
  };

  const pay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      await payBill(String(selected.id), method, coupon);
      setSelected(null);
      setPreview(null);
      await load();
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <LoadingView label="Loading unpaid bills..." />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <Text style={styles.heading}>Billing & payments</Text>
      <Text style={styles.sub}>{orders.length} unpaid orders</Text>

      {orders.length === 0 ? (
        <EmptyState icon="card-outline" title="All bills settled" subtitle="Unpaid dine-in and takeaway orders appear here." />
      ) : (
        <>
          {orders.map((o) => (
            <TouchableOpacity
              key={String(o.id)}
              style={[styles.card, shadows.sm, selected?.id === o.id && styles.cardSelected]}
              onPress={() => selectOrder(o)}
            >
              <View style={styles.row}>
                <Text style={styles.num}>{String(o.order_number)}</Text>
                <Text style={styles.amount}>{formatCurrency(Number(o.net_amount))}</Text>
              </View>
              <Text style={styles.meta}>{String(o.order_type).replace(/_/g, ' ')} · {String(o.order_status)}</Text>
            </TouchableOpacity>
          ))}

          {selected && (
            <View style={[styles.panel, shadows.md]}>
              <Text style={styles.panelTitle}>Collect payment</Text>
              <Text style={styles.panelAmount}>{formatCurrency(Number(preview?.net_amount ?? selected.net_amount))}</Text>
              <View style={styles.methodRow}>
                {['cash', 'upi', 'card'].map((m) => (
                  <TouchableOpacity key={m} style={[styles.method, method === m && styles.methodActive]} onPress={() => setMethod(m)}>
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.payBtn} onPress={pay} disabled={paying}>
                <Text style={styles.payText}>{paying ? 'Processing...' : 'Mark as paid'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  heading: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  sub: { color: theme.colors.muted, marginBottom: 16, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: theme.colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { fontWeight: '800', fontSize: 16, color: theme.colors.ink },
  amount: { fontWeight: '800', color: statusColor('unpaid') },
  meta: { color: theme.colors.muted, marginTop: 6, textTransform: 'capitalize' },
  panel: { backgroundColor: '#1E1B4B', borderRadius: 20, padding: 20, marginTop: 8 },
  panelTitle: { color: '#C7D2FE', fontWeight: '600' },
  panelAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 12 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  method: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  methodActive: { backgroundColor: theme.colors.primary },
  methodText: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  methodTextActive: { color: '#fff' },
  payBtn: { backgroundColor: theme.colors.success, borderRadius: 14, padding: 16, alignItems: 'center' },
  payText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
