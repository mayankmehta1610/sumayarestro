import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { getTableFloor, markTableFree } from '../api';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';
import { shadows, statusColor } from '../utils';

type Props = { onOrder: (tableId: string) => void };

export default function TablesScreen({ onOrder }: Props) {
  const [tables, setTables] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await getTableFloor();
    setTables(d.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingView label="Loading floor plan..." />;

  const stats = {
    occupied: tables.filter((t) => t.table_status === 'occupied').length,
    available: tables.filter((t) => t.table_status === 'available').length,
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: theme.colors.accent }]}>
          <Text style={styles.statNum}>{stats.occupied}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: theme.colors.success }]}>
          <Text style={styles.statNum}>{stats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      {tables.length === 0 ? (
        <EmptyState icon="grid-outline" title="No tables configured" subtitle="Ask your manager to set up the floor plan." />
      ) : (
        <View style={styles.grid}>
          {tables.map((t) => {
            const status = String(t.table_status);
            const color = statusColor(status);
            return (
              <View key={String(t.id)} style={[styles.card, { borderColor: color }, shadows.sm]}>
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.badgeText, { color }]}>{status}</Text>
                </View>
                <Text style={styles.num}>Table {String(t.table_number)}</Text>
                <Text style={styles.meta}>{String(t.seating_capacity || 4)} seats · {String(t.floor_name || 'Main')}</Text>
                {status === 'occupied' ? (
                  <>
                    <TouchableOpacity style={styles.btn} onPress={() => onOrder(String(t.id))}>
                      <Text style={styles.btnText}>View order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnOutline}
                      onPress={() => markTableFree(String(t.id)).then(load)}
                    >
                      <Text style={styles.btnOutlineText}>Mark free</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.btn} onPress={() => onOrder(String(t.id))}>
                    <Text style={styles.btnText}>Take order</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderLeftWidth: 4, ...shadows.sm },
  statNum: { fontSize: 28, fontWeight: '800', color: theme.colors.ink },
  statLabel: { color: theme.colors.muted, fontSize: 13, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  num: { fontSize: 22, fontWeight: '800', color: theme.colors.ink },
  meta: { color: theme.colors.muted, fontSize: 12, marginVertical: 6 },
  btn: { backgroundColor: theme.colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnOutline: { borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  btnOutlineText: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
});
