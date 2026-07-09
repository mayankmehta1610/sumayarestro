import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock } from 'lucide-react';
import { getKitchenQueue, advanceKot } from '../lib/api';

export default function KitchenPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => getKitchenQueue(),
    refetchInterval: 5000,
  });

  const advanceMutation = useMutation({
    mutationFn: (kotId: string) => advanceKot(kotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-queue'] }),
  });

  const kots = data?.items || [];

  return (
    <div className="min-h-screen bg-espresso text-cream -m-4 lg:-m-8 p-4 lg:p-8 rounded-none">
      <div className="mb-6 flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-amber-warm" />
        <div>
          <h1 className="font-display text-3xl font-bold">Kitchen Display</h1>
          <p className="text-cream/60">Live queue — auto-refreshes every 5s</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-cream/50">Loading KOT tickets...</p>
      ) : kots.length === 0 ? (
        <div className="py-20 text-center"><p className="text-xl">All caught up! No pending tickets.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kots.map((kot: Record<string, unknown>) => (
            <div key={String(kot.id)} className="rounded-2xl border-l-4 border-amber-warm bg-stone-800 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold">{String(kot.kot_number)}</p>
                  <p className="text-sm text-cream/60">{String(kot.order_number)} · Table {String(kot.table_number || '—')}</p>
                  <p className="text-xs capitalize text-amber-warm mt-1">{String(kot.order_type).replace('_', ' ')}</p>
                </div>
                <span className="badge bg-white/20 capitalize">{String(kot.kot_status)}</span>
              </div>
              <div className="mt-3 space-y-1">
                {(kot.lines as Array<Record<string, unknown>> || []).map((l, i) => (
                  <p key={i} className="text-sm">• {String(l.item_name)} × {String(l.quantity)}</p>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-cream/50">
                <Clock className="h-3 w-3" />
                {kot.fired_at ? new Date(String(kot.fired_at)).toLocaleTimeString() : ''}
              </p>
              <button
                onClick={() => advanceMutation.mutate(String(kot.id))}
                disabled={advanceMutation.isPending || kot.kot_status === 'served'}
                className="btn-primary mt-4 w-full text-sm"
              >
                {kot.kot_status === 'queued' ? 'Start Preparing' :
                 kot.kot_status === 'preparing' ? 'Mark Ready' :
                 kot.kot_status === 'ready' ? 'Mark Served' : 'Done'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
