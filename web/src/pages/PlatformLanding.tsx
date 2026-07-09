import { Link } from 'react-router-dom';
import { Utensils, Crown, ArrowRight } from 'lucide-react';

const RESTAURANTS = [
  { slug: 'spice-garden', name: 'Spice Garden', city: 'Ahmedabad', style: 'Indian Fine Dine' },
  { slug: 'urban-bowl', name: 'Urban Bowl Cafe', city: 'Pune', style: 'Modern Cafe' },
  { slug: 'coastal-curry', name: 'Coastal Curry House', city: 'Mumbai', style: 'Seafood Coastal' },
];

export default function PlatformLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-amber-warm/10">
      <header className="border-b border-amber-warm/20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-chili to-coffee text-lg font-bold text-white">S</div>
            <div>
              <p className="font-display text-xl font-bold text-espresso">Sumaya Resto</p>
              <p className="text-xs text-coffee/60">Restaurant Management Platform</p>
            </div>
          </div>
          <Link to="/login" className="btn-secondary text-sm">
            <Crown className="h-4 w-4" /> Platform Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="font-display text-5xl font-bold text-espresso md:text-6xl">
          Your Restaurant.<br /><span className="text-chili">Your Dashboard.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-coffee/80">
          Sumaya powers multi-branch restaurants with POS, kitchen display, table management,
          customer ordering, and full operations — all role-based and internal.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-espresso">
          Select Your Restaurant to Enter
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {RESTAURANTS.map((r) => (
            <Link
              key={r.slug}
              to={`/r/${r.slug}`}
              className="group card transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-warm/15">
                <Utensils className="h-7 w-7 text-amber-warm" />
              </div>
              <h3 className="font-display text-xl font-bold">{r.name}</h3>
              <p className="text-sm text-coffee/70">{r.style} · {r.city}</p>
              <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-chili group-hover:gap-2 transition-all">
                Open Restaurant Portal <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-amber-warm/20 py-6 text-center text-sm text-coffee/50">
        © 2026 Sumaya Resto Platform · Internal Restaurant OS
      </footer>
    </div>
  );
}
