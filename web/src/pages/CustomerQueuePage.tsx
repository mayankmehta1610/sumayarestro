import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { checkQueueStatus, joinWaitlist } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CustomerQueuePage() {
  const { user } = useAuth();
  const [partySize, setPartySize] = useState(2);
  const [phone, setPhone] = useState('');
  const [myNumber, setMyNumber] = useState<number | null>(null);
  const branchId = user?.branch_id || '';

  const joinMutation = useMutation({
    mutationFn: () => joinWaitlist({
      guest_name: user?.full_name || 'Guest',
      guest_phone: phone,
      party_size: partySize,
      branch_id: branchId,
    }),
    onSuccess: (res) => setMyNumber(res.queue_number),
  });

  const { data: status } = useQuery({
    queryKey: ['queue-status', myNumber, branchId],
    queryFn: () => checkQueueStatus(myNumber!, branchId),
    enabled: !!myNumber && !!branchId,
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <Users className="mx-auto h-12 w-12 text-amber-warm" />
        <h1 className="mt-2 font-display text-2xl font-bold">Join Waiting List</h1>
        <p className="text-coffee/60">Get a queue number while you wait outside</p>
      </div>

      {!myNumber ? (
        <div className="card p-6">
          <input className="input mb-3 w-full" placeholder="Your phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="mb-3 block text-sm">Party size</label>
          <input className="input mb-4 w-full" type="number" min={1} max={12} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} />
          <button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} className="btn-primary w-full">
            Get Queue Number
          </button>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-coffee/60">Your queue number</p>
          <p className="my-4 font-display text-6xl font-bold text-chili">#{myNumber}</p>
          {status && (
            <>
              <p className={`text-lg font-semibold capitalize ${
                status.waitlist_status === 'called' ? 'text-green-600 animate-pulse' : 'text-espresso'
              }`}>
                {status.waitlist_status === 'called' ? 'Your table is ready! Please come in.' :
                 status.waitlist_status === 'seated' ? 'You have been seated. Enjoy!' :
                 `${status.parties_ahead} parties ahead · ~${status.estimated_wait_mins} min`}
              </p>
              <p className="mt-2 text-sm text-coffee/50">Status updates automatically</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
