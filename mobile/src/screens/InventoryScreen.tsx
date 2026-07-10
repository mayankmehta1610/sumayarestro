import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { listResource } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { formatCurrency, shadows } from '../utils';

export default function InventoryScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await listResource('/inventory', { page_size: 40 });
    setItems(d.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingView label="Loading inventory..." />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <Text style={styles.heading}>Inventory & stock</Text>
      <Text style={styles.sub}>{items.length} ingredients tracked</Text>

      {items.length === 0 ? (
        <EmptyState icon="cube-outline" title="No inventory items" subtitle="Ingredients and stock levels appear here." />
      ) : (
        items.map((ing) => {
          const low = Number(ing.current_stock) <= Number(ing.reorder_level);
          return (
            <View key={String(ing.id)} style={[styles.card, shadows.sm, low && styles.low]}>
              <Text style={styles.name}>{String(ing.name)}</Text>
              <Text style={styles.meta}>{String(ing.current_stock)} {String(ing.unit)} · Reorder at {String(ing.reorder_level)}</Text>
              <Text style={styles.cost}>{formatCurrency(Number(ing.cost_per_unit))} / {String(ing.unit)}</Text>
              {low ? <Text style={styles.alert}>Low stock — reorder soon</Text> : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  heading: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  sub: { color: theme.colors.muted, marginBottom: 16, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 },
  low: { borderLeftWidth: 4, borderLeftColor: theme.colors.accent },
  name: { fontWeight: '800', fontSize: 16, color: theme.colors.ink },
  meta: { color: theme.colors.muted, marginTop: 6 },
  cost: { color: theme.colors.primary, fontWeight: '700', marginTop: 4 },
  alert: { color: theme.colors.accent, fontWeight: '700', marginTop: 8, fontSize: 12 },
});
