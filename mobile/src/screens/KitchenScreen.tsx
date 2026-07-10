import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { advanceKot, getKitchenQueue } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { shadows, statusColor } from '../utils';

const COLUMNS = [
  { key: 'queued', label: 'New tickets', color: '#F59E0B' },
  { key: 'preparing', label: 'Cooking', color: '#6366F1' },
  { key: 'ready', label: 'Ready to serve', color: '#10B981' },
];

export default function KitchenScreen() {
  const [kots, setKots] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await getKitchenQueue();
    setKots(d.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  const grouped = useMemo(() => {
    const g: Record<string, Array<Record<string, unknown>>> = { queued: [], preparing: [], ready: [] };
    for (const k of kots) {
      const s = String(k.kot_status);
      if (g[s]) g[s].push(k);
    }
    return g;
  }, [kots]);

  if (loading) return <LoadingView label="Loading kitchen queue..." />;

  return (
    <ScrollView
      style={styles.flex}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Display</Text>
        <Text style={styles.sub}>{kots.length} active tickets</Text>
      </View>

      {kots.length === 0 ? (
        <EmptyState icon="flame-outline" title="Kitchen queue is empty" subtitle="New orders will appear here automatically." />
      ) : (
        COLUMNS.map((col) => (
          <View key={col.key} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.dot, { backgroundColor: col.color }]} />
              <Text style={styles.sectionTitle}>{col.label}</Text>
              <Text style={styles.count}>{grouped[col.key].length}</Text>
            </View>
            {grouped[col.key].map((k) => {
              const lines = (k.lines as Array<Record<string, unknown>>) || [];
              return (
                <View key={String(k.id)} style={[styles.card, shadows.md, { borderLeftColor: col.color }]}>
                  <View style={styles.cardTop}>
                    <Text style={styles.kotNum}>{String(k.kot_number)}</Text>
                    <Text style={[styles.status, { color: statusColor(String(k.kot_status)) }]}>{String(k.kot_status)}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {k.table_number ? `Table ${k.table_number}` : String(k.order_type)} · {String(k.order_number)}
                  </Text>
                  {lines.map((l, idx) => (
                    <Text key={idx} style={styles.line}>×{Number(l.quantity)} {String(l.item_name)}</Text>
                  ))}
                  <TouchableOpacity style={[styles.btn, { backgroundColor: col.color }]} onPress={() => advanceKot(String(k.id)).then(load)}>
                    <Text style={styles.btnText}>Advance status</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 16, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sub: { color: '#94A3B8', marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { color: '#E2E8F0', fontWeight: '700', flex: 1 },
  count: { color: '#94A3B8', fontWeight: '600' },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kotNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  status: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  meta: { color: '#94A3B8', marginVertical: 8, fontSize: 13 },
  line: { color: '#F8FAFC', fontSize: 14, marginBottom: 4 },
  btn: { borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});
