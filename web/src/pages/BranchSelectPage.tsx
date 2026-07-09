import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function BranchSelectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, setBranch } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (branchId: string) => {
    await setBranch(branchId);
    navigate(`/r/${slug}/dashboard`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="card w-full max-w-lg">
        <h1 className="font-display text-2xl font-bold text-espresso">Select Branch</h1>
        <p className="mt-2 text-coffee/70">Choose which branch you are operating at today</p>
        <div className="mt-6 space-y-3">
          {(user?.branches || []).map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              className="w-full rounded-xl border-2 border-amber-warm/30 p-4 text-left transition hover:border-chili hover:bg-chili/5"
            >
              <p className="font-semibold text-espresso">{b.name}</p>
              <p className="text-sm text-coffee/60">{b.city} · {b.code}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
