import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Banknote, Smartphone } from 'lucide-react';
import { listResource, createPayment, updateResource } from '../lib/api';

export default function BillingPage() {
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null);
  const [method, setMethod] = useState('cash');

  const { data: ordersData } = useQuery({
    queryKey: ['billing-orders'],
    queryFn: () => listResource('/orders', { page_size: 50, order_status: 'open' }),
    refetchInterval: 10000,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      await createPayment({
        order_id: selectedOrder.id,
        amount: selectedOrder.net_amount,
        payment_method: method,
        payment_status: 'completed',
      });
      return updateResource('/orders', String(selectedOrder.id), {
        payment_status: 'paid',
        order_status: 'completed',
      });
    },
    onSuccess: () => {
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ['billing-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const unpaid = (ordersData?.items || []).filter((o: Record<string, unknown>) => o.payment_status !== 'paid');

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-espresso">Billing & Payments</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-display text-xl font-bold">Unpaid Orders</h2>
          <div className="space-y-2">
            {unpaid.length === 0 ? (
              <p className="py-8 text-center text-coffee/50">No unpaid orders</p>
            ) : unpaid.map((o: Record<string, unknown>) => (
              <button
                key={String(o.id)}
                onClick={() => setSelectedOrder(o)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedOrder?.id === o.id ? 'border-chili bg-chili/5' : 'border-amber-warm/20 hover:bg-amber-warm/5'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-bold">{String(o.order_number)}</span>
                  <span className="text-chili font-bold">₹{Number(o.net_amount).toFixed(2)}</span>
                </div>
                <p className="text-sm text-coffee/60 capitalize">{String(o.order_type).replace('_', ' ')}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-display text-xl font-bold">Process Payment</h2>
          {selectedOrder ? (
            <div>
              <p className="mb-2 text-3xl font-bold text-chili">₹{Number(selectedOrder.net_amount).toFixed(2)}</p>
              <p className="mb-6 text-coffee/60">Order {String(selectedOrder.order_number)}</p>
              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI', icon: Smartphone },
                  { id: 'card', label: 'Card', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`rounded-xl border-2 p-4 text-center transition ${
                        method === m.id ? 'border-chili bg-chili/5' : 'border-amber-warm/20'
                      }`}
                    >
                      <Icon className="mx-auto h-6 w-6 text-coffee" />
                      <p className="mt-1 text-sm font-medium">{m.label}</p>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="btn-primary w-full"
              >
                {payMutation.isPending ? 'Processing...' : `Collect ₹${Number(selectedOrder.net_amount).toFixed(2)}`}
              </button>
            </div>
          ) : (
            <p className="py-12 text-center text-coffee/50">Select an order to bill</p>
          )}
        </div>
      </div>
    </div>
  );
}
