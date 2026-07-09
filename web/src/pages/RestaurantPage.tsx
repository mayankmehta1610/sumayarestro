import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { getPublicRestaurant, getPublicMenu, createOrder } from '../lib/api';

interface CartItem { id: string; name: string; price: number; qty: number; }

export default function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [branchId, setBranchId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: restaurant, isLoading } = useQuery({
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

  const orderMutation = useMutation({
    mutationFn: () => createOrder({
      order_type: 'dine_in',
      lines: cart.map((c) => ({ menu_item_id: c.id, quantity: c.qty })),
    }),
    onSuccess: () => { setCart([]); alert('Order placed! Our team will prepare it shortly.'); },
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading restaurant...</div>;

  const tenant = restaurant?.tenant;
  const addItem = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant?.primary_color ? `${tenant.primary_color}08` : undefined }}>
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md" style={{ borderColor: `${tenant?.primary_color}30` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: tenant?.secondary_color || '#451A03' }}>
              {tenant?.name}
            </h1>
            <p className="text-sm text-coffee/70">{restaurant?.restaurant?.cuisine_type}</p>
          </div>
          {restaurant?.branches?.length > 1 && (
            <select className="input max-w-xs" value={activeBranch} onChange={(e) => setBranchId(e.target.value)}>
              {restaurant.branches.map((b: { id: string; name: string; city: string }) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {(menu?.categories || []).map((cat: { id: string; name: string; items: Array<{ id: string; name: string; price: number; description: string; is_veg: boolean }> }) => (
              <section key={cat.id}>
                <h2 className="mb-4 font-display text-2xl font-bold text-espresso">{cat.name}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="card text-left transition hover:shadow-md"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-coffee/60 line-clamp-2">{item.description}</p>
                          <span className="mt-1 inline-block text-xs">{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</span>
                        </div>
                        <p className="font-bold" style={{ color: tenant?.secondary_color || '#DC2626' }}>₹{item.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="card sticky top-24 h-fit">
            <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
              <ShoppingBag className="h-5 w-5" /> Your Order
            </h3>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-coffee/50">Browse menu & tap to add</p>
            ) : (
              <>
                {cart.map((c) => (
                  <div key={c.id} className="mb-3 flex items-center justify-between">
                    <span>{c.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart((p) => p.map((x) => x.id === c.id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0))}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-bold">{c.qty}</span>
                      <button onClick={() => addItem({ id: c.id, name: c.name, price: c.price })}>
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="w-16 text-right font-medium">₹{(c.price * c.qty).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
                <hr className="my-4 border-amber-warm/20" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: tenant?.secondary_color }}>₹{total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => orderMutation.mutate()}
                  disabled={orderMutation.isPending}
                  className="btn-primary mt-4 w-full"
                  style={{ backgroundColor: tenant?.secondary_color }}
                >
                  {orderMutation.isPending ? 'Placing...' : 'Place Order'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
