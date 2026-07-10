import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { trackOrder } from '../api';
import LoadingView from '../components/LoadingView';
import { theme } from '../theme';
import { formatCurrency } from '../utils';

type Props = { orderId: string; onBack: () => void };

export default function TrackScreen({ orderId, onBack }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orderId) return;
    trackOrder(orderId).then(setData);
    const i = setInterval(() => trackOrder(orderId).then(setData), 5000);
    return () => clearInterval(i);
  }, [orderId]);

  if (!data) return <LoadingView label="Tracking order..." />;

  const timeline = (data.timeline as Array<Record<string, unknown>>) || [];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.num}>{String(data.order_number)}</Text>
      <Text style={styles.amount}>{formatCurrency(Number(data.net_amount || 0))}</Text>
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{String(data.order_status)}</Text>
      </View>

      <Text style={styles.section}>Order timeline</Text>
      {timeline.map((step) => (
        <View key={String(step.step)} style={styles.step}>
          <View style={[styles.dot, step.done ? styles.dotDone : step.current ? styles.dotCurrent : styles.dotPending]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepLabel, !!step.current && styles.stepActive]}>{String(step.label)}</Text>
            {step.timestamp ? <Text style={styles.stepTime}>{String(step.timestamp)}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.surface },
  back: { marginBottom: 12 },
  backText: { color: theme.colors.primary, fontWeight: '600' },
  num: { fontSize: 22, fontWeight: '800', color: theme.colors.ink },
  amount: { fontSize: 28, fontWeight: '800', color: theme.colors.primary, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  statusText: { color: theme.colors.primary, fontWeight: '700', textTransform: 'capitalize' },
  section: { fontWeight: '800', fontSize: 16, marginTop: 24, marginBottom: 12, color: theme.colors.ink },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12, marginTop: 4 },
  dotDone: { backgroundColor: theme.colors.success },
  dotCurrent: { backgroundColor: theme.colors.warning },
  dotPending: { backgroundColor: '#E2E8F0' },
  stepLabel: { fontSize: 15, color: theme.colors.muted },
  stepActive: { fontWeight: '800', color: theme.colors.ink },
  stepTime: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
});
