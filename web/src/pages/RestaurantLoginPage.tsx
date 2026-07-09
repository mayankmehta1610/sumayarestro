import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_LOGINS } from '../config/roles';

export default function RestaurantLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Sumaya@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demos = DEMO_LOGINS[slug || ''] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, slug);
      if (user.role === 'customer') {
        navigate(`/r/${slug}/order`);
      } else if (user.needs_branch_selection) {
        navigate(`/r/${slug}/select-branch`);
      } else {
        navigate(`/r/${slug}/dashboard`);
      }
    } catch {
      setError('Invalid email or password for this restaurant');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setLoading(true);
    try {
      const user = await login(demoEmail, 'Sumaya@123', slug);
      if (user.needs_branch_selection) navigate(`/r/${slug}/select-branch`);
      else navigate(`/r/${slug}/dashboard`);
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-coffee to-espresso p-12 lg:flex lg:flex-col lg:justify-center">
        <Link to={`/r/${slug}`} className="text-cream/60 text-sm hover:text-cream">← Back</Link>
        <h1 className="mt-4 font-display text-4xl font-bold text-cream capitalize">{slug?.replace(/-/g, ' ')}</h1>
        <p className="mt-2 text-cream/70">Staff portal — role-based access only</p>
        <div className="mt-8 space-y-2">
          <p className="text-sm font-semibold text-amber-warm">Demo Logins (click to use):</p>
          {demos.map((d) => (
            <button
              key={d.email}
              onClick={() => quickLogin(d.email)}
              className="block w-full rounded-xl bg-white/10 px-4 py-2 text-left text-sm text-cream hover:bg-white/20 transition"
            >
              <span className="font-medium">{d.role}</span>
              <span className="ml-2 text-cream/50">{d.email}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="font-display text-3xl font-bold text-espresso">Staff Sign In</h2>
          <p className="mt-2 text-coffee/70 capitalize">{slug?.replace(/-/g, ' ')} internal portal</p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-chili">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          <div className="mt-6 lg:hidden space-y-2">
            {demos.map((d) => (
              <button key={d.email} type="button" onClick={() => quickLogin(d.email)} className="btn-secondary w-full text-sm">
                {d.role}: {d.email}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
