import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { getPublicRestaurant, getPublicMenu, customerPlaceOrder, getTableFloor } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface CartItem { id: string; name: string; price: number; qty: number; }

export default function CustomerOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableId, setTableId] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'customer') navigate(`/r/${slug}/customer/login`);
  }, [user, slug, navigate]);

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => getPublicRestaurant(slug!),
    enabled: !!slug,
  });

  const activeBranch = branchId || restaurant?.branches?.[0]?.id;
  const { data: menu } = useQuery({
    queryKey: ['menu', activeBranch],
    queryFn: () => getPublicMenu(activeBranch),
    enabled: !!activeBranch,
  });

  const { data: floorData } = useQuery({
    queryKey: ['tables-customer', activeBranch],
    queryFn: () => getTableFloor(activeBranch),
    enabled: orderType === 'dine_in' && !!activeBranch,
  });

  const orderMutation = useMutation({
    mutationFn: () => customerPlaceOrder({
      order_type: orderType,
      table_id: orderType === 'dine_in' ? tableId : null,
      branch_id: activeBranch,
      lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
    }),
    onSuccess: (data) => {
      setCart([]);
      navigate(`/r/${slug}/orders/${data.id}/track`);
    },
  });

  if (!user || user.role !== 'customer') return null;

  const addItem = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const availableTables = (floorData?.items || []).filter((t: Record<string, unknown>) => t.table_status === 'available');

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-espresso">Place Your Order</h1>
      <p className="mt-1 text-coffee/70">Welcome, {user.full_name}</p>

      <div className="mt-6 card">
        <h2 className="font-semibold mb-3">Order Type *</h2>
        <div className="flex flex-wrap gap-3">
          {(['dine_in', 'takeaway', 'delivery'] as const).map((t) => (
            <button key={t} onClick={() => setOrderType(t)}
              className={orderType === t ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
              {t === 'dine_in' ? '🍽️ Dine In' : t === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}
            </button>
          ))}
        </div>
        {restaurant?.branches?.length > 1 && (
          <div className="mt-4">
            <label className="label">Branch</label>
            <select className="input max-w-xs" value={activeBranch} onChange={(e) => setBranchId(e.target.value)}>
              {restaurant.branches.map((b: { id: string; name: string; city: string }) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
        )}
        {orderType === 'dine_in' && (
          <div className="mt-4">
            <label className="label">Select Your Table *</label>
            <div className="flex flex-wrap gap-2">
              {availableTables.map((t: Record<string, unknown>) => (
                <button key={String(t.id)} onClick={() => setTableId(String(t.id))}
                  className={tableId === String(t.id) ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
                  Table {String(t.table_number)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {(menu?.categories || []).map((cat: { id: string; name: string; items: Array<{ id: string; name: string; price: number; is_veg: boolean }> }) => (
            <section key={cat.id}>
              <h2 className="font-display text-xl font-bold mb-3">{cat.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cat.items.map((item) => (
                  <button key={item.id} onClick={() => addItem(item)} className="card text-left hover:shadow-md transition">
                    <div className="flex justify-between">
                      <div><p className="font-semibold">{item.name}</p><p className="text-xs">{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</p></div>
                      <p className="font-bold text-chili">₹{item.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="card sticky top-24 h-fit">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold"><ShoppingBag className="h-5 w-5" /> Cart</h3>
          {cart.length === 0 ? <p className="py-8 text-center text-coffee/50">Add items from menu</p> : (
            <>
              {cart.map((c) => (
                <div key={c.id} className="mt-3 flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart((p) => p.map((x) => x.id === c.id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0))}><Minus className="h-3 w-3" /></button>
                    <span className="font-bold">{c.qty}</span>
                    <button onClick={() => addItem(c)}><Plus className="h-3 w-3" /></button>
                    <span>₹{(c.price * c.qty).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              <hr className="my-4 border-amber-warm/20" />
              <p className="text-lg font-bold">Total: <span className="text-chili">₹{total.toFixed(2)}</span></p>
              <button onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending || (orderType === 'dine_in' && !tableId)} className="btn-primary mt-4 w-full">
                {orderMutation.isPending ? 'Placing Order...' : 'Place Order & Track'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
