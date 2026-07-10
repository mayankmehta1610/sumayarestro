import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ScrollView,
  Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { customerRegister, getPublicRestaurant, restaurantLogin } from '../api';

const RESTAURANTS = [
  { slug: 'spice-garden', label: 'Spice Garden', tagline: 'Indian fine dining' },
  { slug: 'urban-bowl', label: 'Urban Bowl', tagline: 'Modern cafe' },
  { slug: 'coastal-curry', label: 'Coastal Curry', tagline: 'Seafood coastal' },
];

type Props = {
  onLoggedIn: (user: Record<string, unknown>) => void;
};

export default function LoginScreen({ onLoggedIn }: Props) {
  const [slug, setSlug] = useState('spice-garden');
  const [email, setEmail] = useState('waiter@spice-garden.com');
  const [password, setPassword] = useState('Sumaya@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hero, setHero] = useState<string | null>(null);

  useEffect(() => {
    getPublicRestaurant(slug).then((r) => {
      const gallery = (r.gallery_images as string[]) || [];
      setHero(gallery[0] || r.logo_url || null);
    }).catch(() => setHero(null));
  }, [slug]);

  const login = async (em: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await restaurantLogin(em, password, slug);
      onLoggedIn(data.user);
    } catch {
      setError('Invalid credentials. Use demo password Sumaya@123');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const map: Record<string, string> = {
      waiter: 'waiter', kitchen: 'kitchen', cashier: 'cashier',
      owner: 'owner', inventory: 'inventory', delivery: 'delivery', customer: 'customer',
    };
    setEmail(`${map[role]}@${slug}.com`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#0F172A', '#1E1B4B', '#312E81']} style={styles.hero}>
            {hero ? <Image source={{ uri: hero }} style={styles.heroImg} /> : null}
            <View style={styles.heroOverlay}>
              <Text style={styles.brand}>Sumaya Resto</Text>
              <Text style={styles.tag}>Professional restaurant operations</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.section}>Select restaurant</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {RESTAURANTS.map((r) => (
                <TouchableOpacity
                  key={r.slug}
                  onPress={() => { setSlug(r.slug); quickLogin('waiter'); }}
                  style={[styles.chip, slug === r.slug && styles.chipActive]}
                >
                  <Text style={[styles.chipTitle, slug === r.slug && styles.chipTitleActive]}>{r.label}</Text>
                  <Text style={[styles.chipSub, slug === r.slug && styles.chipSubActive]}>{r.tagline}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="staff@restaurant.com" autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={() => login(email)} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>

            <Text style={styles.quickLabel}>Quick role access</Text>
            <View style={styles.quickRow}>
              {['waiter', 'kitchen', 'cashier', 'owner', 'inventory', 'delivery', 'customer'].map((r) => (
                <TouchableOpacity key={r} style={styles.quickChip} onPress={() => quickLogin(r)}>
                  <Text style={styles.quickChipText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={async () => {
                const em = `guest.${Date.now()}@${slug}.com`;
                try {
                  const data = await customerRegister({
                    full_name: 'Mobile Guest', email: em, phone: '+91 99999 00000',
                    password: 'Sumaya@123', restaurant_slug: slug,
                  });
                  onLoggedIn(data.user);
                } catch {
                  setError('Registration failed — try customer quick login');
                }
              }}
            >
              <Text style={styles.linkText}>Register as new customer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { flexGrow: 1 },
  hero: { height: 200, overflow: 'hidden' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.35 },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 24 },
  brand: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tag: { color: '#C7D2FE', marginTop: 4, fontSize: 15 },
  card: { margin: 16, marginTop: -24, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  section: { fontSize: 13, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  chip: { width: 140, padding: 14, borderRadius: 16, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: '#EEF2FF' },
  chipTitle: { fontWeight: '700', color: theme.colors.ink, fontSize: 14 },
  chipTitleActive: { color: theme.colors.primary },
  chipSub: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  chipSubActive: { color: '#6366F1' },
  label: { fontWeight: '600', marginBottom: 6, color: theme.colors.ink, fontSize: 13 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15 },
  btn: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: theme.colors.accent, marginBottom: 8, fontSize: 13 },
  quickLabel: { marginTop: 20, fontSize: 12, fontWeight: '600', color: theme.colors.muted, textTransform: 'uppercase' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  quickChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.ink, textTransform: 'capitalize' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: theme.colors.primary, fontWeight: '600' },
});
