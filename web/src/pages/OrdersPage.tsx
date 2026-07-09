import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { listResource } from '../lib/api';

export default function OrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['orders-list'],
    queryFn: () => listResource('/orders', { page_size: 50 }),
    refetchInterval: 10000,
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-espresso">Orders</h1>
      <div className="table-wrap">
        {isLoading ? <div className="p-12 text-center">Loading orders...</div> : (
          <table className="data-table">
            <thead>
              <tr><th>Order #</th><th>Type</th><th>Net</th><th>Status</th><th>Payment</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(data?.items || []).map((o: Record<string, unknown>) => (
                <tr key={String(o.id)}>
                  <td className="font-medium">{String(o.order_number)}</td>
                  <td className="capitalize">{String(o.order_type).replace('_', ' ')}</td>
                  <td className="font-bold text-chili">₹{Number(o.net_amount).toFixed(2)}</td>
                  <td><span className="badge bg-amber-warm/20 capitalize">{String(o.order_status)}</span></td>
                  <td><span className="badge bg-green-100 text-green-800">{String(o.payment_status)}</span></td>
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
