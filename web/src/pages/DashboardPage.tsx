import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Utensils, ChefHat, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard } from '../lib/api';

const COLORS = ['#F59E0B', '#DC2626', '#78350F', '#10B981'];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });

  if (isLoading) return <div className="p-12 text-center text-coffee/60">Loading dashboard from API...</div>;

  const stats = [
    { label: "Today's Sales", value: `₹${data?.today_sales?.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-amber-warm' },
    { label: "Today's Orders", value: data?.today_orders || 0, icon: ShoppingCart, color: 'bg-chili' },
    { label: 'Active Tables', value: `${data?.active_tables}/${data?.total_tables}`, icon: Utensils, color: 'bg-coffee' },
    { label: 'Pending KOTs', value: data?.pending_kots || 0, icon: ChefHat, color: 'bg-orange-600' },
    { label: 'Low Stock Items', value: data?.low_stock_items || 0, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const paymentData = Object.entries(data?.payment_mix || {}).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-espresso">Dashboard</h1>
        <p className="mt-1 text-coffee/70">Real-time restaurant performance from your database</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-amber-warm" /> Top Items Today
          </h2>
          {data?.top_items?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.top_items}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-coffee/50">No orders yet today</p>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 font-display text-xl font-bold">Payment Mix</h2>
          {paymentData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-coffee/50">No payments recorded today</p>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-display text-xl font-bold">Recent Orders</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th><th>Type</th><th>Amount</th><th>Status</th><th>Payment</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_orders || []).map((o: Record<string, unknown>) => (
                <tr key={String(o.id)}>
                  <td className="font-medium">{String(o.order_number)}</td>
                  <td className="capitalize">{String(o.order_type).replace('_', ' ')}</td>
                  <td>₹{Number(o.net_amount).toFixed(2)}</td>
                  <td><span className="badge bg-amber-warm/20 text-coffee">{String(o.order_status)}</span></td>
                  <td><span className="badge bg-green-100 text-green-800">{String(o.payment_status)}</span></td>
                  <td className="text-xs text-coffee/60">{o.created_at ? new Date(String(o.created_at)).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
