import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChefHat, LogIn, ShoppingBag, Users, MapPin, Percent, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPublicRestaurant } from '../lib/api';
import MenuItemImage from '../components/MenuItemImage';
import GalleryImage from '../components/GalleryImage';
import { resolveHeroImage } from '../lib/menuImages';

export default function RestaurantPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (slug) getPublicRestaurant(slug).then(setRestaurant).catch(() => setRestaurant(null));
  }, [slug]);

  if (user && user.restaurant_slug === slug) {
    return <NavigateToDashboard slug={slug!} user={user} />;
  }

  const tenant = restaurant?.tenant as Record<string, unknown> | undefined;
  const rest = restaurant?.restaurant as Record<string, unknown> | undefined;
  const branches = (restaurant?.branches as Array<Record<string, unknown>>) || [];
  const offers = (tenant?.offers as Array<Record<string, unknown>>) || (restaurant?.offers as Array<unknown>) || [];
  const featured = (restaurant?.featured_menu as Array<Record<string, unknown>>) || [];
  const gallery = (tenant?.gallery as string[]) || [];
  const primary = String(tenant?.primary_color || '#B45309');
  const secondary = String(tenant?.secondary_color || '#C9A227');

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-coffee/60">Loading {slug?.replace(/-/g, ' ')}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface" style={{ background: `linear-gradient(180deg, ${primary}15 0%, #F8FAFC 35%, #fff 100%)` }}>
      {/* Hero */}
      <div className="relative h-[420px] overflow-hidden">
        <img
          src={resolveHeroImage(String(tenant?.hero_image || gallery[0] || ''))}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <header className="relative z-10 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={String(tenant.logo_url)} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-lg ring-2 ring-white/30" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg" style={{ background: primary }}>S</div>
            )}
            <div className="text-white">
              <h1 className="font-display text-2xl font-bold">{String(tenant?.name)}</h1>
              <p className="text-sm text-white/80">{String(tenant?.tagline || rest?.cuisine_type)}</p>
            </div>
          </div>
          <Link to={`/r/${slug}/login`} className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30">
            <LogIn className="inline h-4 w-4 mr-1" /> Staff
          </Link>
        </header>
        <div className="relative z-10 mx-auto max-w-4xl px-6 pb-12 pt-8 text-white">
          <p className="max-w-xl text-lg text-white/90">{String(rest?.description || '')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/r/${slug}/customer/login`} className="rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105" style={{ background: secondary }}>
              <ShoppingBag className="inline h-4 w-4 mr-2" /> Order Food
            </Link>
            <Link to={`/r/${slug}/book`} className="rounded-xl border-2 border-white bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/20">
              <Calendar className="inline h-4 w-4 mr-2" /> Book a Table
            </Link>
            <Link to={`/r/${slug}/queue-guest`} className="rounded-xl border-2 border-white/50 px-6 py-3 font-semibold text-white hover:bg-white/10">
              <Users className="inline h-4 w-4 mr-2" /> Join Waitlist
            </Link>
          </div>
        </div>
      </div>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 -mt-8 relative z-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {(offers as Array<{ title?: string; discount?: string; desc?: string }>).map((o, i) => (
              <div key={i} className="rounded-2xl p-5 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                <div className="flex items-center gap-2 text-sm font-bold opacity-90"><Percent className="h-4 w-4" /> {o.discount || ''}</div>
                <h3 className="mt-1 font-display text-lg font-bold">{o.title || ''}</h3>
                <p className="mt-1 text-sm text-white/85">{o.desc || ''}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured menu */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="mb-6 font-display text-3xl font-bold text-espresso flex items-center gap-2">
            <Star className="h-7 w-7 text-amber-warm" /> Chef's Picks
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((item) => (
              <div key={String(item.id)} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-lg">
                <MenuItemImage name={String(item.name)} imageUrl={item.image_url as string} className="h-36 w-full object-cover" eager />
                <div className="p-4">
                  <p className="font-semibold text-espresso">{String(item.name)}</p>
                  <p className="text-xs text-coffee/60 line-clamp-2">{String(item.description)}</p>
                  <p className="mt-2 font-bold" style={{ color: secondary }}>₹{Number(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="bg-white/60 py-14">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mb-6 font-display text-3xl font-bold text-espresso">Our Space</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {gallery.map((url, i) => (
                <GalleryImage key={i} src={String(url)} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Branches & actions */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><ChefHat className="h-5 w-5 text-chili" /> For Staff</h3>
            <p className="mt-2 text-sm text-coffee/70">Waiters, kitchen, cashiers, and branch managers — login to your role-based dashboard</p>
            <Link to={`/r/${slug}/login`} className="btn-primary mt-4 inline-block text-sm">Staff Login →</Link>
          </div>
          <div className="card">
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-chili" /> For Guests</h3>
            <p className="mt-2 text-sm text-coffee/70">Order food, book a table, join the waitlist, or track your order</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/r/${slug}/customer/login`} className="btn-secondary text-sm">Order</Link>
              <Link to={`/r/${slug}/book`} className="btn-secondary text-sm">Reserve</Link>
            </div>
          </div>
        </div>
        {branches.length > 0 && (
          <div className="card mt-6">
            <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Our Branches</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {branches.map((b) => (
                <span key={String(b.id)} className="badge text-sm" style={{ background: `${primary}20`, color: secondary }}>
                  {String(b.name)} — {String(b.city)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-amber-warm/20 py-6 text-center text-sm text-coffee/50">
        Powered by <Link to="/" className="text-chili hover:underline">Sumaya Resto</Link>
      </footer>
    </div>
  );
}

function NavigateToDashboard({ slug, user }: { slug: string; user: { role: string; needs_branch_selection?: boolean } }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (user.role === 'super_admin') navigate('/platform/dashboard');
    else if (user.role === 'customer') navigate(`/r/${slug}/order`);
    else if (user.needs_branch_selection) navigate(`/r/${slug}/select-branch`);
    else navigate(`/r/${slug}/dashboard`);
  }, [slug, user, navigate]);
  return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>;
}
