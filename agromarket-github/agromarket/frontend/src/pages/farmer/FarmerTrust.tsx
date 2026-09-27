import { ShieldCheck } from "lucide-react";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useApp } from "../../context/AppContext";
import { ErrorState, Skeleton } from "../../components/common/ui";
import type { TrustScoreRow } from "../../types";

export default function FarmerTrust() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<TrustScoreRow[]>(() => api("/api/trust-scores"), []);
  const mine = data?.find((t) => t.user_id === user?.id);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Trust Score</h1>
        <p className="text-sm text-ink-soft mt-1">A transparent score based on your transaction history.</p>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !mine ? (
        <div className="card p-8 text-center">
          <ShieldCheck size={32} className="mx-auto text-primary-accent" />
          <p className="mt-2 font-semibold">No score yet</p>
          <p className="text-sm text-ink-soft mt-1">Your score builds as you complete verified transactions.</p>
        </div>
      ) : (
        <div className="card p-7 text-center">
          <ShieldCheck size={36} className="mx-auto text-primary" />
          <p className="mt-3 text-5xl font-bold text-primary-dark">{mine.score}</p>
          <p className="text-sm text-ink-soft mt-1">out of 100</p>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-sm">
            <div><dt className="text-ink-soft text-xs">Completed</dt><dd className="font-semibold text-lg">{mine.completed_transactions}</dd></div>
            <div><dt className="text-ink-soft text-xs">Cancellations</dt><dd className="font-semibold text-lg">{mine.cancelled_transactions}</dd></div>
            <div><dt className="text-ink-soft text-xs">Avg. rating</dt><dd className="font-semibold text-lg">{mine.rating_avg ?? "—"}</dd></div>
          </dl>
        </div>
      )}

      <div className="card p-5 text-sm text-ink-soft">
        <p className="font-medium text-ink mb-1">How scoring works</p>
        Base 70 · +3 per completed transaction (max +18) · −5 per cancellation you cause · +1 per on-time delivery (max
        +6) · up to +6 from ratings. Disputed events outside your control do not reduce your score.
      </div>
    </div>
  );
}
