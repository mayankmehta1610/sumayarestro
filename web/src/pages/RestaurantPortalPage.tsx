import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPublicRestaurant } from '../lib/api';

export default function RestaurantPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (slug) getPublicRestaurant(slug).then(setRestaurant);
  }, [slug]);

  if (user && user.restaurant_slug === slug) {
    return <NavigateToDashboard slug={slug!} user={user} />;
  }

  const tenant = restaurant?.tenant as Record<string, unknown> | undefined;
  const branches = (restaurant?.branches as Array<Record<string, unknown>>) || [];

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${tenant?.primary_color || '#F59E0B'}15, #FFFBEB)` }}>
      <header className="border-b bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <Link to="/" className="text-xs text-coffee/50 hover:text-chili">← Sumaya Platform</Link>
            <h1 className="font-display text-2xl font-bold" style={{ color: tenant?.secondary_color as string || '#451A03' }}>
              {String(tenant?.name || slug)}
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Link to={`/r/${slug}/login`} className="card group hover:shadow-lg transition">
            <h2 className="font-display text-xl font-bold text-espresso">Staff Login</h2>
            <p className="mt-2 text-sm text-coffee/70">Waiters, kitchen, cashiers, managers — access your role-based dashboard</p>
            <p className="mt-4 text-sm font-semibold text-chili group-hover:underline">Enter as Staff →</p>
          </Link>
          <Link to={`/r/${slug}/customer/login`} className="card group hover:shadow-lg transition">
            <h2 className="font-display text-xl font-bold text-espresso">Customer</h2>
            <p className="mt-2 text-sm text-coffee/70">Register or login to place dine-in, takeaway, or delivery orders</p>
            <p className="mt-4 text-sm font-semibold text-chili group-hover:underline">Order Food →</p>
          </Link>
        </div>

        {branches.length > 1 && (
          <div className="card mt-6">
            <h3 className="font-semibold text-espresso">{branches.length} Branches</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {branches.map((b) => (
                <span key={String(b.id)} className="badge bg-amber-warm/20 text-coffee">{String(b.name)} — {String(b.city)}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavigateToDashboard({ slug, user }: { slug: string; user: { role: string; needs_branch_selection?: boolean } }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (user.role === 'customer') navigate(`/r/${slug}/order`);
    else if (user.needs_branch_selection) navigate(`/r/${slug}/select-branch`);
    else navigate(`/r/${slug}/dashboard`);
  }, [slug, user, navigate]);
  return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>;
}
