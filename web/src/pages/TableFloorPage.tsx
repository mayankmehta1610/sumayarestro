import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getTableFloor, markTableFree } from '../lib/api';
import PageHeader from '../components/PageHeader';
import clsx from 'clsx';

const STATUS_CONFIG: Record<string, { bg: string; border: string; label: string; icon: typeof CheckCircle }> = {
  available: { bg: 'bg-green-50', border: 'border-green-400', label: 'Available', icon: CheckCircle },
  occupied: { bg: 'bg-chili/10', border: 'border-chili', label: 'Occupied', icon: Users },
  reserved: { bg: 'bg-amber-warm/10', border: 'border-amber-warm', label: 'Reserved', icon: Clock },
  cleaning: { bg: 'bg-gray-100', border: 'border-gray-400', label: 'Cleaning', icon: AlertCircle },
};

export default function TableFloorPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['table-floor'],
    queryFn: () => getTableFloor(),
    refetchInterval: 8000,
  });

  const freeMutation = useMutation({
    mutationFn: (tableId: string) => markTableFree(tableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-floor'] }),
  });

  const tables = data?.items || [];
  const available = tables.filter((t: Record<string, unknown>) => t.table_status === 'available').length;
  const occupied = tables.filter((t: Record<string, unknown>) => t.table_status === 'occupied').length;

  return (
    <div>
      <PageHeader
        title="Table Floor"
        subtitle="Click a table to take order · Mark free when guests leave"
      >
        <span className="badge bg-green-100 text-green-800">{available} Available</span>
        <span className="badge bg-red-100 text-red-800">{occupied} Occupied</span>
        <button onClick={() => refetch()} className="btn-secondary text-sm">Refresh</button>
      </PageHeader>

      {isLoading ? (
        <p className="text-center text-coffee/60 py-12">Loading tables from database...</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table: Record<string, unknown>) => {
            const cfg = STATUS_CONFIG[String(table.table_status)] || STATUS_CONFIG.available;
            const Icon = cfg.icon;
            const order = table.active_order as Record<string, unknown> | null;
            const isOccupied = table.table_status === 'occupied';

            return (
              <div
                key={String(table.id)}
                data-testid="table-card"
                className={clsx(
                  'relative rounded-2xl border-2 p-5 transition hover:shadow-lg',
                  cfg.bg, cfg.border,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-espresso">T{String(table.table_number)}</span>
                  <Icon className={clsx('h-5 w-5', isOccupied ? 'text-chili' : 'text-green-600')} />
                </div>
                <p className="mt-1 text-xs font-medium text-coffee/70">{cfg.label} · {String(table.capacity)} seats</p>

                {order && (
                  <div className="mt-3 rounded-lg bg-white/60 p-2 text-xs">
                    <p className="font-semibold">{String(order.order_number)}</p>
                    <p className="text-coffee/70">{String(order.item_count)} items · ₹{Number(order.net_amount).toFixed(0)}</p>
                    <p className="capitalize text-chili">{String(order.order_status)}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {isOccupied ? (
                    <>
                      <Link to={`/r/${slug}/tables/${table.id}/order`} className="btn-primary w-full text-center text-sm py-2">
                        Add / View Order
                      </Link>
                      <button
                        onClick={() => freeMutation.mutate(String(table.id))}
                        className="btn-secondary w-full text-sm py-2"
                      >
                        Mark Free
                      </button>
                    </>
                  ) : (
                    <Link to={`/r/${slug}/tables/${table.id}/order`} className="btn-primary w-full text-center text-sm py-2">
                      Take Order
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
