import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { getMyNotifications, getUnreadCount, markNotificationsRead } from '../lib/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: getUnreadCount,
    refetchInterval: 8000,
  });

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getMyNotifications(false),
    enabled: open,
    refetchInterval: open ? 8000 : false,
  });

  const markRead = useMutation({
    mutationFn: () => markNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const count = countData?.count || 0;
  const items = data?.items || [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-coffee hover:bg-amber-warm/10"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-chili px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-amber-warm/20 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-espresso">Notifications</p>
              {count > 0 && (
                <button onClick={() => markRead.mutate()} className="text-xs text-chili hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="p-4 text-sm text-coffee/60">No notifications yet</p>
            ) : (
              items.map((n: Record<string, unknown>) => (
                <div
                  key={String(n.id)}
                  className={`border-b px-4 py-3 text-sm ${n.is_read ? 'bg-white' : 'bg-amber-warm/5'}`}
                >
                  <p className="font-medium text-espresso">{String(n.title)}</p>
                  <p className="text-coffee/70">{String(n.message)}</p>
                  <p className="mt-1 text-xs text-coffee/40">
                    {n.created_at ? new Date(String(n.created_at)).toLocaleString() : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
