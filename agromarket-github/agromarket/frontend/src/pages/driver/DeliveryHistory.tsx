import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Delivery } from "../../types";

export default function DeliveryHistory() {
  const { data, loading, error, retry } = useAsyncData<Delivery[]>(() => api("/api/deliveries/mine"), []);
  const done = (data ?? []).filter((d) => ["completed", "delivered", "cancelled"].includes(d.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery History</h1>
        <p className="text-sm text-ink-soft mt-1">Completed and past deliveries.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : done.length === 0 ? (
        <EmptyState title="No history yet" message="Completed deliveries will be listed here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Delivery</th><th>Route</th><th>Crop</th><th>Weight</th><th>Earnings</th><th>Status</th></tr>
            </thead>
            <tbody>
              {done.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.delivery_code}</td>
                  <td className="max-w-[220px] truncate">{d.pickup_location} → {d.drop_location}</td>
                  <td>{d.crop_name}</td>
                  <td>{kg(d.actual_weight_kg ?? d.load_kg)}</td>
                  <td>{rupees(d.actual_earnings ?? d.estimated_earnings)}</td>
                  <td><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
