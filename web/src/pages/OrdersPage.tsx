import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getKitchenQueue, listResource, updateOrderStatus } from '../lib/api';

const ORDER_STATUSES = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready to Serve' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders-list'],
    queryFn: () => listResource('/orders', { page_size: 50 }),
    refetchInterval: 8000,
  });

  const { data: kotData } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => getKitchenQueue(),
    refetchInterval: 8000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders-list'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const kotByOrder: Record<string, string> = {};
  (kotData?.items || []).forEach((k: Record<string, unknown>) => {
    kotByOrder[String(k.order_id)] = String(k.kot_status);
  });

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold text-espresso">Orders</h1>
      <p className="mb-6 text-sm text-coffee/60">Update status directly or use Kitchen display for KOT flow</p>

      <div className="table-wrap">
        {isLoading ? <div className="p-12 text-center">Loading orders...</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th><th>Type</th><th>Net</th><th>Status</th><th>KOT</th><th>Payment</th><th>Update Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((o: Record<string, unknown>) => (
                <tr key={String(o.id)}>
                  <td className="font-medium">{String(o.order_number)}</td>
                  <td className="capitalize">{String(o.order_type).replace('_', ' ')}</td>
                  <td className="font-bold text-chili">₹{Number(o.net_amount).toFixed(2)}</td>
                  <td>
                    <span className={`badge capitalize ${STATUS_COLORS[String(o.order_status)] || 'bg-amber-warm/20'}`}>
                      {String(o.order_status)}
                    </span>
                  </td>
                  <td className="capitalize text-sm text-coffee/70">{kotByOrder[String(o.id)] || '—'}</td>
                  <td><span className="badge bg-green-100 text-green-800">{String(o.payment_status)}</span></td>
                  <td>
                    <select
                      value={String(o.order_status)}
                      onChange={(e) => statusMutation.mutate({ id: String(o.id), status: e.target.value })}
                      disabled={statusMutation.isPending}
                      className="rounded border border-amber-warm/30 px-2 py-1 text-xs"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Link to={`/r/${slug}/orders/${o.id}/track`} className="btn-secondary px-2 py-1 text-xs">
                      Track
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
