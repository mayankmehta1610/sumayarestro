import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Minus, QrCode } from 'lucide-react';
import { api, getPublicMenu, customerPlaceOrder } from '../lib/api';
import BillSummary from '../components/BillSummary';

interface CartItem { id: string; name: string; price: number; qty: number; }

export default function QROrderPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState('');
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  const { data: qrData } = useQuery({
    queryKey: ['qr', token],
    queryFn: async () => (await api.get(`/public/table/${token}`)).data,
    enabled: !!token,
  });

  const branchId = qrData?.branch?.id;
  const tableId = qrData?.table?.id;

  const { data: menu } = useQuery({
    queryKey: ['qr-menu', branchId],
    queryFn: () => getPublicMenu(branchId!),
    enabled: !!branchId,
  });

  const { data: billPreview } = useQuery({
    queryKey: ['qr-bill', branchId, cart],
    queryFn: async () => (await api.post('/billing/preview', {
      branch_id: branchId,
      lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
    })).data,
    enabled: !!branchId && cart.length > 0,
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/public/qr-order', {
        qr_token: token,
        guest_name: guestName,
        lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
      });
      return data;
    },
    onSuccess: (data) => { setPlaced(true); setOrderId(data.id); },
  });

  const addItem = (item: { id: string; name: string; price: number }) => {
    setCart((p) => {
      const ex = p.find((c) => c.id === item.id);
      if (ex) return p.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...p, { ...item, qty: 1 }];
    });
  };

  if (placed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="card max-w-md text-center">
          <QrCode className="mx-auto h-16 w-16 text-chili" />
          <h1 className="mt-4 font-display text-2xl font-bold">Order Sent to Kitchen!</h1>
          <p className="mt-2 text-coffee/70">Table {qrData?.table?.number} · Your food is being prepared.</p>
          <Link to={`/r/${slug}/orders/${orderId}/track`} className="btn-primary mt-6 inline-block">Track Order</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b bg-white px-6 py-4">
        <Link to={`/r/${slug}`} className="text-sm text-coffee/50">← Back</Link>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-chili" /> Table {qrData?.table?.number || '...'} — QR Order
        </h1>
        <p className="text-sm text-coffee/60">{qrData?.branch?.name}</p>
      </header>
      <div className="mx-auto max-w-4xl p-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <input className="input" placeholder="Your name (optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          {(menu?.categories || []).flatMap((cat: { items: Array<{ id: string; name: string; price: number }> }) => cat.items).map((item) => (
            <button key={item.id} onClick={() => addItem(item)} className="card w-full text-left flex justify-between">
              <span>{item.name}</span>
              <span className="font-bold text-chili">₹{item.price}</span>
            </button>
          ))}
        </div>
        <div className="card h-fit sticky top-4">
          <h2 className="font-bold mb-3">Cart</h2>
          {cart.map((c) => (
            <div key={c.id} className="flex justify-between text-sm mt-2">
              <span>{c.name} x{c.qty}</span>
              <div className="flex gap-2 items-center">
                <button onClick={() => setCart((p) => p.map((x) => x.id === c.id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0))}><Minus className="h-3 w-3" /></button>
                <button onClick={() => addItem(c)}><Plus className="h-3 w-3" /></button>
                <span>₹{(c.price * c.qty).toFixed(0)}</span>
              </div>
            </div>
          ))}
          {billPreview && <div className="mt-4"><BillSummary bill={billPreview} compact /></div>}
          <button onClick={() => orderMutation.mutate()} disabled={cart.length === 0 || orderMutation.isPending} className="btn-primary w-full mt-4">
            {orderMutation.isPending ? 'Sending...' : 'Send to Kitchen'}
          </button>
        </div>
      </div>
    </div>
  );
}
