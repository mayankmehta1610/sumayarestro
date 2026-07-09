import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getCustomerOrders } from '../lib/api';

export default function CustomerOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: getCustomerOrders,
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-espresso">My Orders</h1>
      <p className="mt-1 text-coffee/70">Track all your orders</p>

      {isLoading ? (
        <p className="py-12 text-center text-coffee/60">Loading...</p>
      ) : (data?.items || []).length === 0 ? (
        <div className="card mt-6 text-center py-12">
          <p className="text-coffee/60">No orders yet</p>
          <Link to={`/r/${slug}/order`} className="btn-primary mt-4 inline-block">Place Order</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(data?.items || []).map((o: Record<string, unknown>) => (
            <Link
              key={String(o.id)}
              to={`/r/${slug}/orders/${o.id}/track`}
              className="card flex items-center justify-between hover:shadow-md transition"
            >
              <div>
                <p className="font-bold">{String(o.order_number)}</p>
                <p className="text-sm text-coffee/60 capitalize">{String(o.order_type).replace('_', ' ')} · {new Date(String(o.created_at)).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-chili">₹{Number(o.net_amount).toFixed(0)}</p>
                <span className="badge bg-amber-warm/20 text-coffee capitalize">{String(o.order_status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
