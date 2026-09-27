import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg } from "../../components/common/ui";
import type { ProduceListing } from "../../types";

export default function VerificationHistory() {
  const { data, loading, error, retry } = useAsyncData<ProduceListing[]>(() => api("/api/produce/history"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verification History</h1>
        <p className="text-sm text-ink-soft mt-1">Listings you have reviewed.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No verifications yet" message="Your review history will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Listing</th><th>Crop</th><th>Claimed</th><th>Verified</th><th>Status</th></tr></thead>
            <tbody>
              {data!.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">#{l.id}</td>
                  <td>{l.crop_name}</td>
                  <td>{kg(l.quantity_kg)}</td>
                  <td>{l.verified_weight_kg ? kg(l.verified_weight_kg) : "—"}</td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
