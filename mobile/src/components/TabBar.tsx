import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TAB_ICONS, TAB_LABELS } from '../navigation';
import { theme } from '../theme';

type Props = {
  tabs: Screen[];
  active: Screen;
  onChange: (s: Screen) => void;
};

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {tabs.map((t) => {
        const isActive = active === t;
        const icon = TAB_ICONS[t] as keyof typeof Ionicons.glyphMap;
        return (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => onChange(t)} activeOpacity={0.7}>
            <View style={[styles.iconWrap, isActive && styles.iconActive]}>
              <Ionicons name={icon} size={20} color={isActive ? theme.colors.primary : theme.colors.muted} />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{TAB_LABELS[t]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E2E8F0',
    paddingBottom: 6, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  iconWrap: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: '#EEF2FF' },
  label: { fontSize: 11, color: theme.colors.muted, marginTop: 2, fontWeight: '500' },
  labelActive: { color: theme.colors.primary, fontWeight: '700' },
});
