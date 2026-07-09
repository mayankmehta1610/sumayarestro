import { Link } from 'react-router-dom';
import { Crown, ChefHat, BarChart3, Users, Smartphone, ArrowRight, Sparkles } from 'lucide-react';

const DEMO_URLS = [
  { slug: 'spice-garden', name: 'Spice Garden', city: 'Ahmedabad', color: '#F59E0B', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=280&fit=crop' },
  { slug: 'urban-bowl', name: 'Urban Bowl Cafe', city: 'Pune', color: '#10B981', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=280&fit=crop' },
  { slug: 'coastal-curry', name: 'Coastal Curry House', city: 'Mumbai', color: '#0EA5E9', img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=280&fit=crop' },
];

const FEATURES = [
  { icon: ChefHat, title: 'Kitchen & KOT', desc: 'Live kitchen display with order status from preparing to served' },
  { icon: Users, title: 'Table & Waitlist', desc: 'Card-style floor plan, guest queue, and reservations' },
  { icon: Smartphone, title: 'Customer Ordering', desc: 'QR ordering, track orders, book tables online' },
  { icon: BarChart3, title: 'Branch Operations', desc: 'Inventory, billing, delivery — all branch-specific' },
];

export default function PlatformLanding() {
  return (
    <div className="min-h-screen bg-espresso text-cream">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop" alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-espresso/80 via-espresso/60 to-espresso" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-warm to-chili text-xl font-bold text-white shadow-lg">S</div>
              <div>
                <p className="font-display text-2xl font-bold">Sumaya Resto</p>
                <p className="text-xs text-cream/60">The platform for your restaurant</p>
              </div>
            </div>
            <Link to="/login" className="btn-primary text-sm">
              <Crown className="h-4 w-4" /> Platform Admin
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-warm/20 px-4 py-1.5 text-sm text-amber-warm">
            <Sparkles className="h-4 w-4" /> Built for restaurants, by restaurant people
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
            Run your restaurant.<br />
            <span className="bg-gradient-to-r from-amber-warm to-chili bg-clip-text text-transparent">Delight every guest.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/75">
            Sumaya Resto is a complete restaurant management platform — POS, kitchen display,
            table management, customer ordering, waitlist, reservations, and branch operations.
            Each restaurant gets its own branded URL and CRM.
          </p>
          <p className="mt-4 text-sm text-cream/50">
            Restaurant owners manage branches. Branch managers run daily operations. Super admin oversees the platform.
          </p>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center font-display text-3xl font-bold">Everything your restaurant needs</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-warm/20">
                  <Icon className="h-6 w-6 text-amber-warm" />
                </div>
                <h3 className="font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-cream/65">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Demo restaurants - direct URLs, not a picker */}
      <section className="border-t border-white/10 bg-white/5 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center font-display text-3xl font-bold">Live demo restaurants</h2>
          <p className="mb-10 text-center text-cream/60">Each restaurant has its own direct URL — share with staff and customers</p>
          <div className="grid gap-6 md:grid-cols-3">
            {DEMO_URLS.map((r) => (
              <a
                key={r.slug}
                href={`/r/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-espresso transition hover:-translate-y-1 hover:shadow-2xl"
                style={{ borderColor: `${r.color}40` }}
              >
                <div className="relative h-44 overflow-hidden">
                  <img src={r.img} alt={r.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-bold" style={{ color: r.color }}>{r.name}</h3>
                  <p className="text-sm text-cream/60">{r.city}</p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-cream group-hover:gap-2 transition-all">
                    sumayaresto.com/r/{r.slug} <ArrowRight className="h-4 w-4" />
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-cream/40">
        © 2026 Sumaya Resto Platform · Multi-tenant Restaurant OS
      </footer>
    </div>
  );
}
