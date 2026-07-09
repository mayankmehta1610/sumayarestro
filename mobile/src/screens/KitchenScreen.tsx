import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { theme } from '../theme';
import { listResource, updateResource } from '../api';

const FLOW = ['queued', 'preparing', 'ready', 'served'];

export default function KitchenScreen() {
  const [kots, setKots] = useState<Array<Record<string, unknown>>>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await listResource('/kot', { page_size: 50 });
    setKots((data.items || []).filter((k: Record<string, unknown>) => !['served', 'cancelled'].includes(String(k.kot_status))));
  };

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const advance = async (kot: Record<string, unknown>) => {
    const idx = FLOW.indexOf(String(kot.kot_status));
    const next = FLOW[Math.min(idx + 1, FLOW.length - 1)];
    await updateResource('/kot', String(kot.id), { kot_status: next });
    load();
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Text style={styles.title}>Kitchen Display</Text>
      {kots.length === 0 ? (
        <Text style={styles.empty}>All caught up! ✅</Text>
      ) : kots.map((kot) => (
        <View key={String(kot.id)} style={styles.kotCard}>
          <Text style={styles.kotNum}>{String(kot.kot_number)}</Text>
          <Text style={styles.kotStatus}>{String(kot.kot_status)}</Text>
          <Text style={styles.kotStation}>Station: {String(kot.kitchen_station)}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => advance(kot)}>
            <Text style={styles.btnText}>Advance Status</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.espresso, padding: 16 },
  title: { color: theme.colors.cream, fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 32 },
  empty: { color: theme.colors.gray, textAlign: 'center', marginTop: 40, fontSize: 18 },
  kotCard: { backgroundColor: '#292524', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: theme.colors.amber },
  kotNum: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  kotStatus: { color: theme.colors.amber, textTransform: 'capitalize', marginTop: 4 },
  kotStation: { color: theme.colors.gray, marginTop: 4 },
  btn: { backgroundColor: theme.colors.chili, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
});
