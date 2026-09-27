import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, TableSkeleton } from "../../components/common/ui";
import type { TrustScoreRow } from "../../types";

export default function AdminTrust() {
  const { data, loading, error, retry } = useAsyncData<TrustScoreRow[]>(() => api("/api/trust-scores"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trust Scores</h1>
        <p className="text-sm text-ink-soft mt-1">
          Transparent, transaction-based scoring: base 70 · +3/completed (max +18) · −5/cancellation · +1/on-time
          delivery (max +6) · up to +6 from ratings.
        </p>
      </div>
      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No scores yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Score</th><th>Completed</th><th>Cancelled</th><th>On-time</th><th>Rating</th></tr></thead>
            <tbody>
              {data!.map((t) => (
                <tr key={t.user_id}>
                  <td className="font-medium">{t.user_name}</td>
                  <td className="capitalize">{t.role}</td>
                  <td>
                    <span className={`font-semibold ${t.score >= 80 ? "text-primary-dark" : t.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {t.score}
                    </span>
                  </td>
                  <td>{t.completed_transactions}</td>
                  <td>{t.cancelled_transactions}</td>
                  <td>{t.on_time_deliveries}</td>
                  <td>{t.rating_avg ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
