import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  onLogout: () => void;
};

export default function AppHeader({ title, subtitle, onLogout }: Props) {
  return (
    <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#C7D2FE', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  logout: { color: '#FDA4AF', fontWeight: '600', fontSize: 13 },
});
