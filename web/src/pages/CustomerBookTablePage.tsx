import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicRestaurant } from '../lib/api';
import { api } from '../lib/api';

export default function CustomerBookTablePage() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', guest_count: 2, reserved_at: '', event_type: 'dinner', notes: '' });
  const [branchId, setBranchId] = useState('');

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => getPublicRestaurant(slug!),
    enabled: !!slug,
  });

  const tenant = restaurant?.tenant as Record<string, unknown> | undefined;
  const branches = (restaurant?.branches as Array<Record<string, unknown>>) || [];
  const primary = String(tenant?.primary_color || '#F59E0B');
  const activeBranch = branchId || String(branches[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/reservations/book-public', {
      ...form,
      guest_count: Number(form.guest_count),
      reserved_at: new Date(form.reserved_at).toISOString(),
      branch_id: activeBranch,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="card max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 font-display text-2xl font-bold">Table Reserved!</h1>
          <p className="mt-2 text-coffee/70">We'll confirm your booking shortly. See you soon!</p>
          <Link to={`/r/${slug}`} className="btn-primary mt-6 inline-block">Back to Restaurant</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b bg-white px-6 py-4">
        <Link to={`/r/${slug}`} className="text-sm text-coffee/50 hover:text-chili">← {String(tenant?.name || slug)}</Link>
        <h1 className="mt-1 font-display text-2xl font-bold text-espresso flex items-center gap-2">
          <Calendar className="h-6 w-6" style={{ color: primary }} /> Book a Table
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg p-6 space-y-4">
        {branches.length > 1 && (
          <div>
            <label className="label">Branch</label>
            <select className="input" value={activeBranch} onChange={(e) => setBranchId(e.target.value)} required>
              {branches.map((b) => (
                <option key={String(b.id)} value={String(b.id)}>{String(b.name)} — {String(b.city)}</option>
              ))}
            </select>
          </div>
        )}
        <div><label className="label">Your Name</label><input className="input" required value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" required value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></div>
        <div><label className="label">Guests</label><input className="input" type="number" min={1} max={20} value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: Number(e.target.value) })} /></div>
        <div><label className="label">Date & Time</label><input className="input" type="datetime-local" required value={form.reserved_at} onChange={(e) => setForm({ ...form, reserved_at: e.target.value })} /></div>
        <div>
          <label className="label">Occasion</label>
          <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            <option value="dinner">Dinner</option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div><label className="label">Special requests</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <button type="submit" className="btn-primary w-full" style={{ backgroundColor: primary }}>Confirm Reservation</button>
        <p className="text-center text-xs text-coffee/50">
          Already have an account? <Link to={`/r/${slug}/customer/login`} className="text-chili">Login to order</Link>
        </p>
      </form>
    </div>
  );
}
