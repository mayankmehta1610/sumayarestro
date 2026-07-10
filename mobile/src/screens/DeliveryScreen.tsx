import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { listResource } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { shadows, statusColor } from '../utils';

export default function DeliveryScreen() {
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await listResource('/delivery', { page_size: 30 });
    setDeliveries(d.items || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <LoadingView label="Loading deliveries..." />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <Text style={styles.heading}>Delivery dispatch</Text>
      <Text style={styles.sub}>{deliveries.length} active deliveries</Text>

      {deliveries.length === 0 ? (
        <EmptyState icon="bicycle-outline" title="No deliveries" subtitle="Delivery orders from the kitchen appear here for dispatch." />
      ) : (
        deliveries.map((d) => (
          <View key={String(d.id)} style={[styles.card, shadows.sm]}>
            <View style={styles.row}>
              <Text style={styles.id}>#{String(d.id).slice(0, 8)}</Text>
              <Text style={[styles.status, { color: statusColor(String(d.delivery_status)) }]}>{String(d.delivery_status).replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.meta}>Rider: {String(d.rider_name || 'Assigning...')}</Text>
            <Text style={styles.meta}>Order: {String(d.order_number || d.order_id)}</Text>
          </View>
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
  id: { fontWeight: '800', color: theme.colors.ink },
  status: { fontWeight: '700', textTransform: 'capitalize', fontSize: 13 },
  meta: { color: theme.colors.muted, marginTop: 6, fontSize: 13 },
});
