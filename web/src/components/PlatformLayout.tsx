import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from '../pages/SuperAdminDashboard';

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-amber-warm/20 bg-white/90 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chili to-coffee text-white font-bold">S</div>
            <div>
              <p className="font-display text-lg font-bold text-espresso">Sumaya Platform</p>
              <p className="text-xs text-coffee/60 flex items-center gap-1"><Crown className="h-3 w-3" /> Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-coffee/60 hover:text-chili">Platform Home</Link>
            <span className="text-sm font-medium text-espresso">{user?.full_name}</span>
            <button onClick={handleLogout} className="rounded-lg p-2 text-coffee hover:bg-red-50 hover:text-chili">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6 lg:p-8">
        <SuperAdminDashboard />
      </main>
    </div>
  );
}
