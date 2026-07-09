import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Minus, ArrowLeft, Send } from 'lucide-react';
import { listResource, createOrder, markTableOccupied, api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BillSummary from '../components/BillSummary';

interface CartItem { menu_item_id: string; name: string; price: number; quantity: number; }

export default function TableOrderPage() {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState('dine_in');
  const [couponCode, setCouponCode] = useState('');

  const { data: menuData } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => listResource('/menus/items', { page_size: 100 }),
  });
  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => listResource('/tables', { page_size: 100 }),
  });

  const table = (tablesData?.items || []).find((t: Record<string, unknown>) => String(t.id) === tableId);

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (table?.table_status === 'available') {
        await markTableOccupied(tableId!);
      }
      return createOrder({
        order_type: orderType,
        table_id: tableId,
        coupon_code: couponCode || undefined,
        lines: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
      });
    },
    onSuccess: (data) => {
      navigate(`/r/${slug}/orders/${data.id}/track`);
    },
  });

  const addItem = (item: Record<string, unknown>) => {
    const id = String(item.id);
    setCart((prev) => {
      const ex = prev.find((c) => c.menu_item_id === id);
      if (ex) return prev.map((c) => c.menu_item_id === id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: id, name: String(item.name), price: Number(item.price), quantity: 1 }];
    });
  };

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const branchId = user?.branch_id;

  const { data: billPreview } = useQuery({
    queryKey: ['bill-preview', branchId, cart, couponCode],
    queryFn: async () => {
      if (!branchId || cart.length === 0) return null;
      const { data } = await api.post('/billing/preview', {
        branch_id: branchId,
        lines: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
        coupon_code: couponCode || undefined,
      });
      return data;
    },
    enabled: !!branchId && cart.length > 0,
  });

  return (
    <div>
      <Link to={`/r/${slug}/tables`} className="mb-4 inline-flex items-center gap-1 text-sm text-coffee hover:text-chili">
        <ArrowLeft className="h-4 w-4" /> Back to Floor
      </Link>
      <h1 className="font-display text-3xl font-bold text-espresso">
        Table {table ? String(table.table_number) : tableId?.slice(0, 8)}
      </h1>

      <div className="mt-4 flex gap-3">
        {['dine_in', 'takeaway'].map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={orderType === t ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            {t === 'dine_in' ? 'Dine In' : 'Takeaway'}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
          {(menuData?.items || []).filter((i: Record<string, unknown>) => i.is_available).map((item: Record<string, unknown>) => (
            <button key={String(item.id)} onClick={() => addItem(item)} className="card text-left hover:ring-2 hover:ring-amber-warm/40 transition">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{String(item.name)}</p>
                  <p className="text-xs text-coffee/60">{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</p>
                </div>
                <p className="font-bold text-chili">₹{Number(item.price)}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="card sticky top-24 h-fit">
          <h2 className="font-display text-xl font-bold">Order Cart</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-coffee/50">Tap items to add</p>
          ) : (
            <>
              {cart.map((c) => (
                <div key={c.menu_item_id} className="mt-3 flex items-center justify-between">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart((p) => p.map((x) => x.menu_item_id === c.menu_item_id ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0))}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold">{c.quantity}</span>
                    <button onClick={() => addItem({ id: c.menu_item_id, name: c.name, price: c.price })}>
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-right">₹{(c.price * c.quantity).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              <hr className="my-4 border-amber-warm/20" />
              <input className="input mb-3 text-sm" placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
              {billPreview ? (
                <BillSummary bill={billPreview} compact />
              ) : (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{total.toFixed(2)}</span></div>
                </div>
              )}
              <button onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending} className="btn-primary mt-4 w-full">
                <Send className="h-4 w-4" /> {orderMutation.isPending ? 'Sending to Kitchen...' : 'Place Order & Send to Kitchen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
