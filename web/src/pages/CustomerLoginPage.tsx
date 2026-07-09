import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_LOGINS } from '../config/roles';

export default function CustomerLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { customerLogin, customerRegister } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: 'Sumaya@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demos = (DEMO_LOGINS[slug || ''] || []).filter((d) => d.role === 'Customer');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await customerLogin(form.email, form.password, slug!);
      navigate(`/r/${slug}/order`);
    } catch {
      setError('Invalid credentials. Register first if new customer.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await customerRegister({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        restaurant_slug: slug,
      });
      navigate(`/r/${slug}/order`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-md">
        <Link to={`/r/${slug}`} className="text-sm text-coffee hover:text-chili">← Back</Link>
        <div className="card mt-4">
          <h1 className="font-display text-2xl font-bold capitalize">{slug?.replace(/-/g, ' ')}</h1>
          <p className="text-coffee/70">Customer portal — register to place orders</p>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setMode('login')} className={mode === 'login' ? 'btn-primary flex-1 text-sm' : 'btn-secondary flex-1 text-sm'}>Login</button>
            <button onClick={() => setMode('register')} className={mode === 'register' ? 'btn-primary flex-1 text-sm' : 'btn-secondary flex-1 text-sm'}>Register</button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </>
            )}
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="text-sm text-chili">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'login' ? 'Login & Order' : 'Register & Order'}
            </button>
          </form>

          {demos.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-coffee/60 mb-2">Demo customer:</p>
              {demos.map((d) => (
                <button
                  key={d.email}
                  onClick={async () => {
                    setForm({ ...form, email: d.email });
                    await customerLogin(d.email, d.password, slug!);
                    navigate(`/r/${slug}/order`);
                  }}
                  className="btn-secondary w-full text-sm"
                >
                  {d.email}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
