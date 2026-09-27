import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { ProduceListing } from "../../types";

export default function ProduceManagement() {
  const { data, loading, error, retry } = useAsyncData<ProduceListing[]>(() => api("/api/produce/all"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produce Listings</h1>
        <p className="text-sm text-ink-soft mt-1">All listings and their verification status.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No listings" message="No produce has been listed yet." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Crop</th><th>Quantity</th><th>Price</th><th>Village</th><th>Status</th><th>Rejected reason</th></tr></thead>
            <tbody>
              {data!.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">#{l.id}</td>
                  <td>{l.crop_name}</td>
                  <td>{kg(l.quantity_kg)}</td>
                  <td>{rupees(l.expected_price_per_kg)}/kg</td>
                  <td>{l.village}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td className="text-xs text-ink-soft">{l.rejection_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
