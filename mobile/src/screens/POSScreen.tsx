import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme';
import { listResource, createOrder } from '../api';

interface CartItem { id: string; name: string; price: number; qty: number; }

export default function POSScreen() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listResource('/menus/items', { page_size: 100 }).then((d) => setItems(d.items || []));
  }, []);

  const addItem = (item: Record<string, unknown>) => {
    const id = String(item.id);
    setCart((prev) => {
      const ex = prev.find((c) => c.id === id);
      if (ex) return prev.map((c) => c.id === id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id, name: String(item.name), price: Number(item.price), qty: 1 }];
    });
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    setLoading(true);
    try {
      await createOrder({ order_type: 'dine_in', lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })) });
      setCart([]);
      Alert.alert('Success', 'Order placed!');
    } catch {
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.menu}>
        {items.filter((i) => i.is_available).map((item) => (
          <TouchableOpacity key={String(item.id)} style={styles.itemCard} onPress={() => addItem(item)}>
            <View>
              <Text style={styles.itemName}>{String(item.name)}</Text>
              <Text style={styles.itemVeg}>{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</Text>
            </View>
            <Text style={styles.itemPrice}>₹{Number(item.price)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.cart}>
        <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
        {cart.map((c) => (
          <View key={c.id} style={styles.cartRow}>
            <Text>{c.name} x{c.qty}</Text>
            <Text style={styles.cartPrice}>₹{(c.price * c.qty).toFixed(0)}</Text>
          </View>
        ))}
        <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>
        <TouchableOpacity style={styles.orderBtn} onPress={placeOrder} disabled={loading || !cart.length}>
          <Text style={styles.orderBtnText}>{loading ? 'Placing...' : 'Place Order'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  menu: { flex: 1, padding: 12 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: theme.colors.espresso },
  itemVeg: { fontSize: 11, marginTop: 2 },
  itemPrice: { fontSize: 18, fontWeight: '700', color: theme.colors.chili },
  cart: { backgroundColor: theme.colors.espresso, padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  cartTitle: { color: theme.colors.cream, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  cartPrice: { color: theme.colors.amber, fontWeight: '600' },
  total: { color: theme.colors.cream, fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  orderBtn: { backgroundColor: theme.colors.chili, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12 },
  orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
