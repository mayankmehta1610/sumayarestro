import { useQuery } from '@tanstack/react-query';
import { Building2, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

async function getPlatformDashboard() {
  const { data } = await api.get('/reports/platform');
  return data;
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-dashboard'], queryFn: getPlatformDashboard });

  if (isLoading) return <div className="p-12 text-center">Loading platform overview...</div>;

  const stats = [
    { label: 'Registered Restaurants', value: data?.registered_restaurants || 0, icon: Building2, color: 'bg-amber-warm' },
    { label: 'Active Tenants', value: data?.active_tenants || 0, icon: Users, color: 'bg-coffee' },
    { label: 'Total Restaurant Revenue', value: `₹${(data?.platform_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-chili' },
    { label: 'Subscription MRR', value: `₹${(data?.subscription_mrr || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-green-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-espresso">Sumaya Platform</h1>
        <p className="mt-1 text-coffee/70">Super admin — restaurants registered and revenue collected per tenant</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-coffee/70">{s.label}</p>
                <p className="text-2xl font-bold text-espresso">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="mb-4 font-display text-xl font-bold">Restaurants on Platform</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th><th>Cuisine</th><th>Branches</th><th>Orders</th><th>Revenue</th><th>Portal</th>
              </tr>
            </thead>
            <tbody>
              {(data?.restaurants || []).map((r: Record<string, unknown>) => (
                <tr key={String(r.id)}>
                  <td>
                    <div className="flex items-center gap-3">
                      {r.logo_url ? (
                        <img src={String(r.logo_url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg" style={{ background: String(r.primary_color) }} />
                      )}
                      <span className="font-medium">{String(r.name)}</span>
                    </div>
                  </td>
                  <td className="capitalize">{String(r.cuisine_type || '—')}</td>
                  <td>{String(r.branches)}</td>
                  <td>{String(r.total_orders)}</td>
                  <td className="font-bold text-chili">₹{Number(r.total_revenue).toLocaleString()}</td>
                  <td>
                    <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" className="text-sm text-chili hover:underline">
                      /r/{String(r.slug)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-sm text-coffee/50">
        <Link to="/" className="text-chili hover:underline">← Back to platform home</Link>
      </p>
    </div>
  );
}
