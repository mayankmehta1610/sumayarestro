import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { bookReservation, cancelReservation, checkInReservation, getTodayReservations } from '../lib/api';

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', guest_count: 2, reserved_at: '', event_type: 'dinner', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['reservations-today'],
    queryFn: () => getTodayReservations(),
    refetchInterval: 15000,
  });

  const bookMutation = useMutation({
    mutationFn: () => bookReservation({ ...form, guest_count: Number(form.guest_count), reserved_at: new Date(form.reserved_at).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations-today'] });
      setForm({ guest_name: '', guest_phone: '', guest_count: 2, reserved_at: '', event_type: 'dinner', notes: '' });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => checkInReservation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations-today'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations-today'] }),
  });

  const items = data?.items || [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Calendar className="h-8 w-8 text-amber-warm" />
        <div>
          <h1 className="font-display text-3xl font-bold text-espresso">Reservations & Appointments</h1>
          <p className="text-coffee/60">Book tables, check in guests, manage appointments</p>
        </div>
      </div>

      <div className="mb-6 card p-4">
        <h2 className="mb-3 font-semibold">New Reservation</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="input" placeholder="Guest name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="Guests" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: Number(e.target.value) })} />
          <input className="input" type="datetime-local" value={form.reserved_at} onChange={(e) => setForm({ ...form, reserved_at: e.target.value })} />
          <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            <option value="dinner">Dinner</option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="business">Business</option>
          </select>
          <input className="input" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button onClick={() => bookMutation.mutate()} disabled={!form.guest_name || !form.reserved_at || bookMutation.isPending} className="btn-primary mt-3">
          Book Reservation
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="data-table">
            <thead>
              <tr><th>Guest</th><th>Phone</th><th>Guests</th><th>Date/Time</th><th>Event</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((r: Record<string, unknown>) => (
                <tr key={String(r.id)}>
                  <td className="font-medium">{String(r.guest_name)}</td>
                  <td>{String(r.guest_phone || '—')}</td>
                  <td>{String(r.guest_count)}</td>
                  <td>{r.reserved_at ? new Date(String(r.reserved_at)).toLocaleString() : '—'}</td>
                  <td className="capitalize">{String(r.event_type || '—')}</td>
                  <td><span className="badge capitalize bg-amber-warm/20">{String(r.reservation_status)}</span></td>
                  <td className="flex gap-1">
                    {r.reservation_status === 'confirmed' && (
                      <button onClick={() => checkInMutation.mutate(String(r.id))} className="btn-secondary px-2 py-1 text-xs flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Check In
                      </button>
                    )}
                    {r.reservation_status !== 'cancelled' && r.reservation_status !== 'seated' && (
                      <button onClick={() => cancelMutation.mutate(String(r.id))} className="text-xs text-chili hover:underline flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
