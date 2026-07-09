import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, Send } from 'lucide-react';
import { listResource, createOrder } from '../lib/api';

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [coupon, setCoupon] = useState('');

  const { data: menuData } = useQuery({
    queryKey: ['menu-items-pos'],
    queryFn: () => listResource('/menus/items', { page_size: 100 }),
  });
  const { data: tablesData } = useQuery({
    queryKey: ['tables-pos'],
    queryFn: () => listResource('/tables', { page_size: 100 }),
  });

  const orderMutation = useMutation({
    mutationFn: () => createOrder({
      order_type: orderType,
      table_id: tableId || null,
      coupon_code: coupon || null,
      lines: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
    }),
    onSuccess: () => {
      setCart([]);
      setCoupon('');
      qc.invalidateQueries({ queryKey: ['/orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      alert('Order placed successfully!');
    },
  });

  const addToCart = (item: Record<string, unknown>) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === String(item.id));
      if (existing) return prev.map((c) => c.menu_item_id === String(item.id) ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: String(item.id), name: String(item.name), price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev
      .map((c) => c.menu_item_id === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter((c) => c.quantity > 0));
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-espresso">Waiter POS</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex gap-3">
            <select className="input max-w-xs" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              <option value="dine_in">Dine In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
            <select className="input max-w-xs" value={tableId} onChange={(e) => setTableId(e.target.value)}>
              <option value="">Select Table</option>
              {(tablesData?.items || []).map((t: Record<string, unknown>) => (
                <option key={String(t.id)} value={String(t.id)}>
                  Table {String(t.table_number)} ({String(t.table_status)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(menuData?.items || []).filter((i: Record<string, unknown>) => i.is_available).map((item: Record<string, unknown>) => (
              <button
                key={String(item.id)}
                onClick={() => addToCart(item)}
                className="card text-left transition hover:shadow-md hover:ring-2 hover:ring-amber-warm/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-espresso">{String(item.name)}</p>
                    <p className="mt-1 text-xs text-coffee/60">{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</p>
                  </div>
                  <p className="text-lg font-bold text-chili">₹{Number(item.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card sticky top-24 h-fit">
          <h2 className="mb-4 font-display text-xl font-bold">Current Order</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-coffee/50">Tap items to add</p>
          ) : (
            <div className="space-y-3">
              {cart.map((c) => (
                <div key={c.menu_item_id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-coffee/60">₹{c.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(c.menu_item_id, -1)} className="rounded-lg bg-amber-warm/10 p-1"><Minus className="h-4 w-4" /></button>
                    <span className="w-6 text-center font-bold">{c.quantity}</span>
                    <button onClick={() => updateQty(c.menu_item_id, 1)} className="rounded-lg bg-amber-warm/10 p-1"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <hr className="border-amber-warm/20" />
              <input className="input" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax (5%)</span><span>₹{tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-chili">₹{total.toFixed(2)}</span></div>
              </div>
              <button
                onClick={() => orderMutation.mutate()}
                disabled={orderMutation.isPending || cart.length === 0}
                className="btn-primary w-full"
              >
                <Send className="h-4 w-4" /> {orderMutation.isPending ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
