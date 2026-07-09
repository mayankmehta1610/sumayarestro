import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { checkQueueStatus, getPublicRestaurant } from '../lib/api';
import { api } from '../lib/api';

export default function GuestQueuePage() {
  const { slug } = useParams<{ slug: string }>();
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [myNumber, setMyNumber] = useState<number | null>(null);
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

  const joinMutation = useMutation({
    mutationFn: () => api.post('/waitlist/join-public', {
      guest_name: guestName, guest_phone: phone, party_size: partySize, branch_id: activeBranch,
    }),
    onSuccess: (res) => setMyNumber(res.data.queue_number),
  });

  const { data: status } = useQuery({
    queryKey: ['queue-status', myNumber, activeBranch],
    queryFn: () => checkQueueStatus(myNumber!, activeBranch),
    enabled: !!myNumber && !!activeBranch,
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b bg-white px-6 py-4">
        <Link to={`/r/${slug}`} className="text-sm text-coffee/50 hover:text-chili">← {String(tenant?.name)}</Link>
        <h1 className="mt-1 font-display text-2xl font-bold flex items-center gap-2">
          <Users style={{ color: primary }} /> Join Waiting List
        </h1>
      </header>
      <div className="mx-auto max-w-lg p-6">
        {!myNumber ? (
          <div className="card">
            {branches.length > 1 && (
              <select className="input mb-3 w-full" value={activeBranch} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={String(b.id)} value={String(b.id)}>{String(b.name)}</option>)}
              </select>
            )}
            <input className="input mb-3 w-full" placeholder="Your name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <input className="input mb-3 w-full" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input mb-4 w-full" type="number" min={1} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} />
            <button onClick={() => joinMutation.mutate()} disabled={!guestName || joinMutation.isPending} className="btn-primary w-full" style={{ backgroundColor: primary }}>
              Get Queue Number
            </button>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-sm text-coffee/60">Your number</p>
            <p className="my-4 font-display text-6xl font-bold" style={{ color: primary }}>#{myNumber}</p>
            {status && (
              <p className={`text-lg font-semibold ${status.waitlist_status === 'called' ? 'text-green-600 animate-pulse' : ''}`}>
                {status.waitlist_status === 'called' ? 'Your table is ready! Please come in.' :
                 `${status.parties_ahead} parties ahead · ~${status.estimated_wait_mins} min`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
