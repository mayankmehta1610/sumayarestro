import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu, X, LogOut, MapPin, UtensilsCrossed } from 'lucide-react';
import { getNavForRole, ROLE_LABELS } from '../config/roles';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import clsx from 'clsx';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = user ? getNavForRole(user.role) : [];
  const base = `/r/${slug}`;
  const branchName = user?.branches?.find((b) => b.id === user.branch_id)?.name;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-surface-dark via-indigo-950 to-surface-dark text-white shadow-2xl transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight truncate capitalize">{slug?.replace(/-/g, ' ')}</p>
            <p className="text-xs text-white/50">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        {branchName && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            <span className="font-medium">{branchName}</span>
          </div>
        )}

        <nav className="h-[calc(100vh-8rem)] overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const path = `${base}/${item.path}`;
            const active = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <Link key={item.id} to={path} onClick={() => setSidebarOpen(false)}
                className={clsx('sidebar-link mb-0.5', active && 'active')}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/90 px-4 backdrop-blur-md lg:px-8">
          <button className="rounded-lg p-2 hover:bg-primary/10 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-ink" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{user?.full_name}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[user?.role || '']}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-accent/10 hover:text-accent" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
