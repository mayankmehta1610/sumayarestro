import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme';
import { getPublicRestaurant, getPublicMenu, createOrder } from '../api';

interface CartItem { id: string; name: string; price: number; qty: number; }

const RESTAURANTS = ['spice-garden', 'urban-bowl', 'coastal-curry'];

export default function CustomerScreen() {
  const [slug, setSlug] = useState('spice-garden');
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);
  const [menu, setMenu] = useState<Record<string, unknown> | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    getPublicRestaurant(slug).then(async (r) => {
      setRestaurant(r);
      const branchId = r.branches?.[0]?.id;
      if (branchId) setMenu(await getPublicMenu(branchId));
    });
  }, [slug]);

  const addItem = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const order = async () => {
    if (!cart.length) return;
    await createOrder({ order_type: 'takeaway', lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })) });
    setCart([]);
    Alert.alert('Success', 'Order placed!');
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const categories = (menu?.categories as Array<Record<string, unknown>>) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{String((restaurant?.tenant as Record<string, unknown>)?.name || 'Sumaya Resto')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {RESTAURANTS.map((s) => (
            <TouchableOpacity key={s} style={[styles.tab, slug === s && styles.tabActive]} onPress={() => setSlug(s)}>
              <Text style={[styles.tabText, slug === s && styles.tabTextActive]}>{s.replace('-', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView style={styles.menu}>
        {categories.map((cat) => (
          <View key={String(cat.id)}>
            <Text style={styles.catName}>{String(cat.name)}</Text>
            {((cat.items as Array<Record<string, unknown>>) || []).map((item) => (
              <TouchableOpacity key={String(item.id)} style={styles.item} onPress={() => addItem({ id: String(item.id), name: String(item.name), price: Number(item.price) })}>
                <Text style={styles.itemName}>{String(item.name)}</Text>
                <Text style={styles.itemPrice}>₹{Number(item.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartTotal}>₹{total.toFixed(0)} ({cart.length} items)</Text>
          <TouchableOpacity style={styles.orderBtn} onPress={order}>
            <Text style={styles.orderBtnText}>Order</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { backgroundColor: theme.colors.chili, paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  tabs: { marginTop: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#fff', textTransform: 'capitalize', fontSize: 12 },
  tabTextActive: { color: theme.colors.chili },
  menu: { flex: 1, padding: 16 },
  catName: { fontSize: 20, fontWeight: '700', color: theme.colors.espresso, marginBottom: 8, marginTop: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  itemName: { fontWeight: '600' },
  itemPrice: { fontWeight: '700', color: theme.colors.chili },
  cartBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.espresso, padding: 16 },
  cartTotal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  orderBtn: { backgroundColor: theme.colors.amber, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  orderBtnText: { fontWeight: '700', color: theme.colors.espresso },
});
