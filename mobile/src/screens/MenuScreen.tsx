import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';
import { listResource } from '../api';

export default function MenuScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listResource('/menus/items', { page_size: 100 }).then((d) => setItems(d.items || []));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Menu Items</Text>
      {items.map((item) => (
        <View key={String(item.id)} style={styles.card}>
          <Text style={styles.name}>{String(item.name)}</Text>
          <View style={styles.row}>
            <Text style={styles.price}>₹{Number(item.price)}</Text>
            <Text style={styles.status}>{item.is_available ? '✅ Available' : '❌ Unavailable'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: 16, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.espresso, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  price: { fontWeight: '700', color: theme.colors.chili },
  status: { fontSize: 12 },
});
