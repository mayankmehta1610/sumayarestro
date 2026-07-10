import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { createOrder, listResource } from '../api';
import LoadingView from '../components/LoadingView';
import { theme } from '../theme';
import { formatCurrency, shadows } from '../utils';

type CartItem = { id: string; name: string; price: number; qty: number; image?: string };

import { resolveMenuImage } from '../menuImages';

type Props = { tableId?: string; onPlaced: (id: string) => void };

export default function POSScreen({ tableId, onPlaced }: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    listResource('/menus/items', { page_size: 60 }).then((d) => {
      setItems((d.items || []).filter((i: Record<string, unknown>) => i.is_available));
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((i) => cats.add(String(i.category_name || 'Menu')));
    return ['all', ...Array.from(cats)];
  }, [items]);

  const filtered = category === 'all' ? items : items.filter((i) => String(i.category_name) === category);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const addToCart = (item: Record<string, unknown>) => {
    const id = String(item.id);
    setCart((prev) => {
      const ex = prev.find((c) => c.id === id);
      if (ex) return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id, name: String(item.name), price: Number(item.price), qty: 1, image: item.image_url as string }];
    });
  };

  const place = async () => {
    if (!cart.length) return;
    setPlacing(true);
    try {
      const r = await createOrder({
        order_type: tableId ? 'dine_in' : 'takeaway',
        table_id: tableId,
        lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
      });
      setCart([]);
      onPlaced(r.id);
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <LoadingView label="Loading menu..." />;

  return (
    <View style={styles.flex}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {categories.map((c) => (
          <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c === 'all' ? 'All items' : c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: cart.length ? 120 : 24 }}>
        {filtered.map((item) => (
          <TouchableOpacity key={String(item.id)} style={[styles.card, shadows.sm]} onPress={() => addToCart(item)} activeOpacity={0.9}>
            <Image source={{ uri: resolveMenuImage(String(item.name), item.image_url as string) }} style={styles.img} />
            <View style={styles.cardBody}>
              <Text style={styles.name}>{String(item.name)}</Text>
              <Text style={styles.desc} numberOfLines={2}>{String(item.description || 'Chef special')}</Text>
              <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
            </View>
            <View style={styles.addBtn}><Text style={styles.addText}>+</Text></View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.cartBar, shadows.md]}>
          <View>
            <Text style={styles.cartTitle}>{cart.length} items · {formatCurrency(total)}</Text>
            <Text style={styles.cartSub}>{tableId ? 'Dine-in order' : 'Takeaway order'}</Text>
          </View>
          <TouchableOpacity style={styles.placeBtn} onPress={place} disabled={placing}>
            <Text style={styles.placeText}>{placing ? 'Placing...' : 'Place order'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  catBar: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  catActive: { backgroundColor: '#EEF2FF' },
  catText: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
  catTextActive: { color: theme.colors.primary },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', alignItems: 'center' },
  img: { width: 80, height: 80 },
  imgPlaceholder: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  imgLetter: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  cardBody: { flex: 1, padding: 12 },
  name: { fontWeight: '800', fontSize: 15, color: theme.colors.ink },
  desc: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: theme.colors.primary, fontWeight: '800', marginTop: 6 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  addText: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 },
  cartBar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#1E1B4B', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
  cartTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cartSub: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },
  placeBtn: { backgroundColor: theme.colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginLeft: 12 },
  placeText: { color: '#fff', fontWeight: '700' },
});
