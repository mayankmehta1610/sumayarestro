import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Banknote, Smartphone, Printer, Tag } from 'lucide-react';
import { api } from '../lib/api';
import BillSummary from '../components/BillSummary';
import BillPrintTemplate from '../components/BillPrintTemplate';

async function listOrders(params?: Record<string, unknown>) {
  const { data } = await api.get('/orders/list', { params });
  return data;
}

export default function BillingPage() {
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null);
  const [method, setMethod] = useState('cash');
  const [couponCode, setCouponCode] = useState('');
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [billPreview, setBillPreview] = useState<Record<string, unknown> | null>(null);

  const { data: ordersData } = useQuery({
    queryKey: ['billing-orders'],
    queryFn: () => listOrders({ page_size: 50 }),
    refetchInterval: 10000,
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      const { data } = await api.post(`/billing/apply-coupon/${selectedOrder.id}`, { coupon_code: couponCode.toUpperCase() });
      setBillPreview(data.bill);
      return data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      const { data } = await api.post(`/billing/pay/${selectedOrder.id}`, {
        payment_method: method,
        coupon_code: couponCode || undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      setReceipt(data?.receipt || null);
      setSelectedOrder(null);
      setCouponCode('');
      setBillPreview(null);
      qc.invalidateQueries({ queryKey: ['billing-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const printMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post(`/billing/print/${orderId}`);
      setReceipt(data.receipt);
      return data;
    },
  });

  const unpaid = (ordersData?.items || []).filter((o: Record<string, unknown>) => o.payment_status !== 'paid');

  const displayBill = billPreview || (selectedOrder ? {
    gross_amount: selectedOrder.gross_amount,
    discount_amount: selectedOrder.discount_amount,
    service_charge_amount: (selectedOrder.tax_breakdown as Record<string, number>)?.service_charge,
    cgst_amount: (selectedOrder.tax_breakdown as Record<string, number>)?.cgst,
    sgst_amount: (selectedOrder.tax_breakdown as Record<string, number>)?.sgst,
    tax_amount: selectedOrder.tax_amount,
    net_amount: selectedOrder.net_amount,
    coupon_code: selectedOrder.coupon_code,
    tax_breakdown: selectedOrder.tax_breakdown,
  } : null);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-espresso">Billing & Payments</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-display text-xl font-bold">Unpaid Orders</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {unpaid.length === 0 ? (
              <p className="py-8 text-center text-coffee/50">No unpaid orders</p>
            ) : unpaid.map((o: Record<string, unknown>) => (
              <button
                key={String(o.id)}
                onClick={() => { setSelectedOrder(o); setBillPreview(null); setCouponCode(String(o.coupon_code || '')); }}
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
              <p className="mb-4 text-coffee/60">Order {String(selectedOrder.order_number)}</p>

              <div className="mb-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <button onClick={() => previewMutation.mutate()} disabled={!couponCode || previewMutation.isPending} className="btn-secondary flex items-center gap-1">
                  <Tag className="h-4 w-4" /> Apply
                </button>
              </div>

              {displayBill && <BillSummary bill={displayBill as never} />}

              <div className="mb-6 mt-4 grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI', icon: Smartphone },
                  { id: 'card', label: 'Card', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setMethod(m.id)} className={`rounded-xl border-2 p-4 text-center transition ${method === m.id ? 'border-chili bg-chili/5' : 'border-amber-warm/20'}`}>
                      <Icon className="mx-auto h-6 w-6 text-coffee" />
                      <p className="mt-1 text-sm font-medium">{m.label}</p>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="btn-primary w-full mb-2">
                {payMutation.isPending ? 'Processing...' : `Collect ₹${Number(displayBill?.net_amount || selectedOrder.net_amount).toFixed(2)}`}
              </button>
              <button onClick={() => printMutation.mutate(String(selectedOrder.id))} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Printer className="h-4 w-4" /> Print Preview
              </button>
            </div>
          ) : (
            <p className="py-12 text-center text-coffee/50">Select an order to bill</p>
          )}
        </div>
      </div>
      {receipt && <BillPrintTemplate receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
