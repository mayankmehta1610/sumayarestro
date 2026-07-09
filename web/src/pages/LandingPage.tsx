import { Link } from 'react-router-dom';
import { Utensils, QrCode, BarChart3, Truck, ArrowRight } from 'lucide-react';

const RESTAURANTS = [
  { slug: 'spice-garden', name: 'Spice Garden', style: 'Indian Fine Dine', city: 'Ahmedabad', color: '#F59E0B' },
  { slug: 'urban-bowl', name: 'Urban Bowl Cafe', style: 'Modern Cafe', city: 'Pune', color: '#78350F' },
  { slug: 'coastal-curry', name: 'Coastal Curry House', style: 'Seafood Coastal', city: 'Mumbai', color: '#DC2626' },
];

const FEATURES = [
  { icon: Utensils, title: 'Waiter POS', desc: 'Fast table-side order capture' },
  { icon: QrCode, title: 'QR Ordering', desc: 'Contactless customer ordering' },
  { icon: BarChart3, title: 'Analytics', desc: 'Real-time sales & inventory insights' },
  { icon: Truck, title: 'Delivery', desc: 'Takeaway & dispatch management' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-cream via-amber-warm/10 to-chili/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chili text-lg font-bold text-white">S</div>
            <span className="font-display text-xl font-bold text-espresso">Sumaya Resto</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="btn-secondary">Staff Login</Link>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="font-display text-5xl font-bold leading-tight text-espresso md:text-7xl">
            Restaurant Management,<br />
            <span className="text-chili">Reimagined</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-coffee/80">
            Multi-tenant POS, QR ordering, kitchen display, inventory, delivery & analytics —
            everything your restaurant needs, powered by real-time APIs.
          </p>
        </div>
      </header>

      {/* Restaurants */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-8 text-center font-display text-3xl font-bold text-espresso">Our Restaurants</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {RESTAURANTS.map((r) => (
            <Link
              key={r.slug}
              to={`/r/${r.slug}`}
              className="group card overflow-hidden transition hover:shadow-xl hover:-translate-y-1"
            >
              <div className="mb-4 h-32 rounded-xl" style={{ background: `linear-gradient(135deg, ${r.color}, ${r.color}88)` }} />
              <h3 className="font-display text-xl font-bold text-espresso">{r.name}</h3>
              <p className="text-sm text-coffee/70">{r.style} · {r.city}</p>
              <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-chili group-hover:gap-2 transition-all">
                Order Now <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-espresso py-16 text-cream">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-10 text-center font-display text-3xl font-bold">Everything You Need</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl bg-white/5 p-6 backdrop-blur">
                  <Icon className="h-8 w-8 text-amber-warm" />
                  <h3 className="mt-3 font-display text-lg font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-cream/70">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-coffee/60">
        © 2026 Sumaya Resto · Multi-tenant Restaurant OS
      </footer>
    </div>
  );
}
