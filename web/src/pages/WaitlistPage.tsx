import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Phone, Bell } from 'lucide-react';
import { callNextGuest, getWaitlistQueue, joinWaitlist, seatWaitlistGuest, listResource } from '../lib/api';

export default function WaitlistPage() {
  const qc = useQueryClient();
  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [phone, setPhone] = useState('');
  const [seatEntryId, setSeatEntryId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => getWaitlistQueue(),
    refetchInterval: 5000,
  });

  const { data: tablesData } = useQuery({
    queryKey: ['tables-list'],
    queryFn: () => listResource('/tables', { page_size: 50 }),
    enabled: !!seatEntryId,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinWaitlist({ guest_name: guestName, guest_phone: phone, party_size: partySize }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waitlist'] });
      setGuestName(''); setPhone('');
    },
  });

  const callMutation = useMutation({
    mutationFn: () => callNextGuest(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waitlist', 'notif-count'] }),
  });

  const seatMutation = useMutation({
    mutationFn: () => seatWaitlistGuest(seatEntryId!, selectedTable),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waitlist'] });
      setSeatEntryId(null); setSelectedTable('');
    },
  });

  const items = data?.items || [];
  const waiting = items.filter((e: Record<string, unknown>) => e.waitlist_status === 'waiting');
  const called = items.filter((e: Record<string, unknown>) => e.waitlist_status === 'called');

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Users className="h-8 w-8 text-amber-warm" />
        <div>
          <h1 className="font-display text-3xl font-bold text-espresso">Guest Waitlist</h1>
          <p className="text-coffee/60">Queue management — call numbers and seat guests from waiting area</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-1">
          <h2 className="mb-3 font-semibold">Add to Queue</h2>
          <input className="input mb-2 w-full" placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          <input className="input mb-2 w-full" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input mb-3 w-full" type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} />
          <button onClick={() => joinMutation.mutate()} disabled={!guestName || joinMutation.isPending} className="btn-primary w-full">
            Join Queue
          </button>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-4 flex gap-3">
            <button onClick={() => callMutation.mutate()} disabled={waiting.length === 0 || callMutation.isPending} className="btn-primary flex items-center gap-2">
              <Bell className="h-4 w-4" /> Call Next Guest
            </button>
            <span className="self-center text-sm text-coffee/60">{waiting.length} waiting · {called.length} called</span>
          </div>

          {isLoading ? <p>Loading queue...</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((e: Record<string, unknown>) => (
                <div key={String(e.id)} className={`rounded-xl border p-4 ${
                  e.waitlist_status === 'called' ? 'border-green-400 bg-green-50' :
                  e.waitlist_status === 'waiting' ? 'border-amber-warm/40 bg-cream' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-chili">#{String(e.queue_number)}</span>
                    <span className="badge capitalize">{String(e.waitlist_status)}</span>
                  </div>
                  <p className="font-medium">{String(e.guest_name)}</p>
                  <p className="text-sm text-coffee/60">Party of {String(e.party_size)} · ~{String(e.estimated_wait_mins)} min</p>
                  {e.guest_phone ? <p className="flex items-center gap-1 text-xs text-coffee/50"><Phone className="h-3 w-3" />{String(e.guest_phone)}</p> : null}
                  {e.waitlist_status === 'called' && (
                    <button onClick={() => setSeatEntryId(String(e.id))} className="btn-secondary mt-2 w-full text-xs">
                      Seat at Table
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {seatEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card w-full max-w-md p-6">
            <h3 className="mb-4 font-semibold">Assign Table</h3>
            <select className="input mb-4 w-full" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
              <option value="">Select table...</option>
              {(tablesData?.items || []).filter((t: Record<string, unknown>) => t.table_status === 'available').map((t: Record<string, unknown>) => (
                <option key={String(t.id)} value={String(t.id)}>Table {String(t.table_number)} (seats {String(t.capacity)})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => seatMutation.mutate()} disabled={!selectedTable} className="btn-primary flex-1">Confirm</button>
              <button onClick={() => setSeatEntryId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
