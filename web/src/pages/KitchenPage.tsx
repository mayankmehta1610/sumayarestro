import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { advanceKot, getKitchenQueue } from '../lib/api';

const STATUS_FLOW = ['queued', 'preparing', 'ready', 'served'] as const;

const STATUS_LABELS: Record<string, string> = {
  queued: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
  served: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-gray-100 text-gray-600',
};

export default function KitchenPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => getKitchenQueue(),
    refetchInterval: 4000,
  });

  const advanceMutation = useMutation({
    mutationFn: (kotId: string) => advanceKot(kotId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['kitchen-queue'] });
      qc.invalidateQueries({ queryKey: ['orders-list'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      if (res?.message) {
        // visual feedback via browser - no alert spam
      }
    },
  });

  const kots = data?.items || [];

  return (
    <div className="min-h-screen bg-espresso text-cream -m-4 lg:-m-8 p-4 lg:p-8 rounded-none">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Kitchen Display</h1>
          <p className="text-cream/60">Update order status: Preparing → Ready → Served</p>
        </div>
        <Link to={`/r/${slug}/orders`} className="btn-secondary text-sm">View All Orders</Link>
      </div>

      <div className="mb-4 flex gap-2 text-xs">
        {STATUS_FLOW.map((s) => (
          <span key={s} className={`badge capitalize ${STATUS_COLORS[s]}`}>{s}</span>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-cream/50">Loading KOT tickets...</p>
      ) : kots.length === 0 ? (
        <div className="py-20 text-center"><p className="text-xl">All caught up! No pending tickets.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kots.map((kot: Record<string, unknown>) => {
            const status = String(kot.kot_status);
            return (
              <div key={String(kot.id)} className={`rounded-2xl border-l-4 p-5 ${
                status === 'ready' ? 'border-green-400 bg-green-900/30' :
                status === 'preparing' ? 'border-orange-400 bg-orange-900/20' :
                'border-amber-warm bg-stone-800'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-bold">{String(kot.kot_number)}</p>
                    <p className="text-sm text-cream/60">{String(kot.order_number)} · Table {String(kot.table_number || '—')}</p>
                  </div>
                  <span className={`badge capitalize ${STATUS_COLORS[status] || 'bg-white/20'}`}>{status}</span>
                </div>
                <div className="mt-3 space-y-1">
                  {(kot.lines as Array<Record<string, unknown>> || []).map((l, i) => (
                    <p key={i} className="text-sm">• {String(l.item_name)} × {String(l.quantity)}
                      <span className="ml-2 text-xs text-cream/50 capitalize">({String(l.line_status)})</span>
                    </p>
                  ))}
                </div>
                {status !== 'served' && (
                  <button
                    onClick={() => advanceMutation.mutate(String(kot.id))}
                    disabled={advanceMutation.isPending}
                    className="btn-primary mt-4 w-full text-sm"
                  >
                    {STATUS_LABELS[status] || 'Advance'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
