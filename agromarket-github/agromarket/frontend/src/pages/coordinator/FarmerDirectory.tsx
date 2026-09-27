import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton } from "../../components/common/ui";
import type { CoordinatorFarmer } from "../../types";

export default function FarmerDirectory() {
  const { data, loading, error, retry } = useAsyncData<CoordinatorFarmer[]>(() => api("/api/produce/coordinator/farmers"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Farmer Directory</h1>
        <p className="text-sm text-ink-soft mt-1">All registered farmers and their listing counts.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No farmers registered yet" message="Use Register Farmer to add the first one." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Phone</th><th>Village</th><th>District</th><th>Listings</th><th>Account</th></tr></thead>
            <tbody>
              {data!.map((f) => (
                <tr key={f.farmer_id}>
                  <td className="font-medium">{f.full_name}</td>
                  <td>{f.phone}</td>
                  <td>{f.village}</td>
                  <td>{f.district}</td>
                  <td>{f.listing_count}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
