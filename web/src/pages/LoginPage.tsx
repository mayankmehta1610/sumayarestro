import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_LOGINS } from '../config/roles';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sumayaresto.com');
  const [password, setPassword] = useState('Sumaya@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'super_admin') navigate('/platform/dashboard');
      else navigate('/');
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm text-coffee hover:text-chili">← Sumaya Platform</Link>
        <form onSubmit={handleSubmit} className="card mt-4">
          <h1 className="font-display text-2xl font-bold">Sumaya Platform Admin</h1>
          <p className="text-sm text-coffee/70 mt-1">Super admin access only</p>
          <div className="mt-6 space-y-4">
            <div><label className="label">Email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">Password</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p className="text-sm text-chili">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Signing in...' : 'Sign In'}</button>
          </div>
          <div className="mt-4 text-xs text-coffee/60">
            {DEMO_LOGINS.platform?.map((d) => <p key={d.email}>{d.role}: {d.email}</p>)}
          </div>
        </form>
      </div>
    </div>
  );
}
