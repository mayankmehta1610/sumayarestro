import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme';
import { listResource } from '../api';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listResource('/orders', { page_size: 50 }).then((d) => setOrders(d.items || []));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Orders</Text>
      {orders.map((o) => (
        <View key={String(o.id)} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.orderNum}>{String(o.order_number)}</Text>
            <Text style={styles.amount}>₹{Number(o.net_amount).toFixed(0)}</Text>
          </View>
          <Text style={styles.meta}>{String(o.order_type)} · {String(o.order_status)} · {String(o.payment_status)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: 16, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.espresso, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNum: { fontWeight: '700', fontSize: 16 },
  amount: { fontWeight: '700', color: theme.colors.chili },
  meta: { color: theme.colors.gray, marginTop: 4, textTransform: 'capitalize' },
});
