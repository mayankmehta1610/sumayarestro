import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { trackOrder } from '../lib/api';
import clsx from 'clsx';

export default function OrderTrackPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: () => trackOrder(orderId!),
    refetchInterval: 5000,
    enabled: !!orderId,
  });

  if (isLoading) return <div className="p-12 text-center">Loading order status...</div>;
  if (!data) return <div className="p-12 text-center text-chili">Order not found</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/r/${slug}/orders`} className="text-sm text-coffee hover:text-chili">← All Orders</Link>
      <div className="card mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{data.order_number}</h1>
            <p className="text-sm text-coffee/70 capitalize">{data.order_type?.replace('_', ' ')} order</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-chili">₹{Number(data.net_amount).toFixed(2)}</p>
            <span className="badge bg-amber-warm/20 text-coffee capitalize">{data.order_status}</span>
          </div>
        </div>

        <button onClick={() => refetch()} className="btn-secondary mt-4 text-sm">Refresh Status</button>
      </div>

      {/* Timeline */}
      <div className="card mt-6">
        <h2 className="mb-6 font-display text-xl font-bold">Order Progress</h2>
        <div className="space-y-0">
          {(data.timeline || []).map((step: Record<string, unknown>, i: number) => (
            <div key={String(step.step)} className="flex gap-4">
              <div className="flex flex-col items-center">
                {step.done ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : step.current ? (
                  <Clock className="h-6 w-6 animate-pulse text-amber-warm" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
                {i < (data.timeline as unknown[]).length - 1 && (
                  <div className={clsx('w-0.5 flex-1 min-h-[32px]', step.done ? 'bg-green-400' : 'bg-gray-200')} />
                )}
              </div>
              <div className="pb-6">
                <p className={clsx('font-semibold', step.current ? 'text-chili' : step.done ? 'text-espresso' : 'text-coffee/50')}>
                  {String(step.label)}
                </p>
                {step.current ? <p className="text-xs text-amber-warm">In progress...</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="card mt-6">
        <h2 className="mb-4 font-display text-xl font-bold">Items</h2>
        {(data.lines || []).map((line: Record<string, unknown>, i: number) => (
          <div key={i} className="flex justify-between border-b border-amber-warm/10 py-2 last:border-0">
            <span>{String(line.item_name)} × {String(line.quantity)}</span>
            <span className="font-medium">₹{Number(line.line_total).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* KOT */}
      {(data.kots || []).length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-4 font-display text-xl font-bold">Kitchen Ticket</h2>
          {(data.kots as Array<Record<string, unknown>>).map((kot) => (
            <div key={String(kot.kot_number)} className="flex justify-between">
              <span className="font-mono font-bold">{String(kot.kot_number)}</span>
              <span className="badge bg-orange-100 text-orange-800 capitalize">{String(kot.kot_status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
