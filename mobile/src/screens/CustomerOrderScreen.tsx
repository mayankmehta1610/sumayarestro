import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { customerPlaceOrder, getPublicMenu, getPublicRestaurant } from '../api';
import LoadingView from '../components/LoadingView';
import { theme } from '../theme';
import { formatCurrency, shadows } from '../utils';

type CartItem = { id: string; name: string; price: number; qty: number; image?: string };

type Props = { slug: string; onPlaced: (id: string) => void };

export default function CustomerOrderScreen({ slug, onPlaced }: Props) {
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);
  const [menu, setMenu] = useState<Record<string, unknown> | null>(null);
  const [branchId, setBranchId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');

  useEffect(() => {
    getPublicRestaurant(slug).then(async (r) => {
      setRestaurant(r);
      const bid = r.branches[0].id;
      setBranchId(bid);
      setMenu(await getPublicMenu(bid));
      setLoading(false);
    });
  }, [slug]);

  const cats = (menu?.categories as Array<Record<string, unknown>>) || [];
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const hero = useMemo(() => {
    const gallery = (restaurant?.gallery_images as string[]) || [];
    return gallery[0] || restaurant?.logo_url || null;
  }, [restaurant]);

  const addItem = (item: Record<string, unknown>) => {
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
      const r = await customerPlaceOrder({
        order_type: orderType,
        branch_id: branchId,
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
      <ScrollView style={{ flex: 1 }}>
        <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.hero}>
          {hero ? <Image source={{ uri: String(hero) }} style={styles.heroImg} /> : null}
          <View style={styles.heroContent}>
            <Text style={styles.brand}>{String(restaurant?.name || 'Restaurant')}</Text>
            <Text style={styles.tagline}>{String(restaurant?.tagline || 'Order fresh, track live')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.typeRow}>
          {(['takeaway', 'delivery'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.typeChip, orderType === t && styles.typeActive]} onPress={() => setOrderType(t)}>
              <Text style={[styles.typeText, orderType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {cats.map((cat) => (
          <View key={String(cat.id)} style={styles.section}>
            <Text style={styles.catTitle}>{String(cat.name)}</Text>
            {((cat.items as Array<Record<string, unknown>>) || []).map((item) => (
              <TouchableOpacity key={String(item.id)} style={[styles.card, shadows.sm]} onPress={() => addItem(item)} activeOpacity={0.9}>
                {item.image_url ? (
                  <Image source={{ uri: String(item.image_url) }} style={styles.img} />
                ) : (
                  <View style={[styles.img, styles.placeholder]}><Text style={styles.letter}>{String(item.name).charAt(0)}</Text></View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{String(item.name)}</Text>
                  <Text style={styles.desc} numberOfLines={2}>{String(item.description || '')}</Text>
                  <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
                </View>
                <View style={styles.add}><Text style={styles.addText}>+</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: cart.length ? 100 : 24 }} />
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.cartBar, shadows.md]}>
          <View>
            <Text style={styles.cartTitle}>{cart.reduce((s, c) => s + c.qty, 0)} items</Text>
            <Text style={styles.cartAmount}>{formatCurrency(total)}</Text>
          </View>
          <TouchableOpacity style={styles.orderBtn} onPress={place} disabled={placing}>
            <Text style={styles.orderText}>{placing ? 'Placing...' : 'Place order'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  hero: { height: 180, overflow: 'hidden' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  brand: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { color: '#C7D2FE', marginTop: 4 },
  typeRow: { flexDirection: 'row', padding: 16, gap: 10 },
  typeChip: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeActive: { backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: theme.colors.primary },
  typeText: { fontWeight: '600', color: theme.colors.muted, textTransform: 'capitalize' },
  typeTextActive: { color: theme.colors.primary },
  section: { paddingHorizontal: 16 },
  catTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: theme.colors.ink },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', alignItems: 'center' },
  img: { width: 88, height: 88 },
  placeholder: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  cardBody: { flex: 1, padding: 12 },
  name: { fontWeight: '800', fontSize: 15 },
  desc: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: theme.colors.primary, fontWeight: '800', marginTop: 6 },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  addText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cartBar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#1E1B4B', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
  cartTitle: { color: '#C7D2FE', fontSize: 12 },
  cartAmount: { color: '#fff', fontWeight: '800', fontSize: 20 },
  orderBtn: { backgroundColor: theme.colors.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginLeft: 'auto' },
  orderText: { color: '#fff', fontWeight: '800' },
});
