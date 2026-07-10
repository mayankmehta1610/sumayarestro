import { theme } from './theme';

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

export function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    available: theme.colors.success,
    occupied: theme.colors.accent,
    reserved: theme.colors.warning,
    queued: theme.colors.warning,
    preparing: theme.colors.primary,
    ready: theme.colors.success,
    served: theme.colors.muted,
    unpaid: theme.colors.accent,
    paid: theme.colors.success,
    pending: theme.colors.warning,
    in_transit: theme.colors.primary,
    delivered: theme.colors.success,
  };
  return map[status] || theme.colors.muted;
}
