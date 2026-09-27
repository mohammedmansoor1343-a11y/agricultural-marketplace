import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, StatusBadge, kg, rupees } from "../../components/common/ui";
import type { BulkLot } from "../../types";

export default function BuyerLots() {
  const { data, loading, error, retry } = useAsyncData<BulkLot[]>(() => api("/api/lots"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Lots</h1>
        <p className="text-sm text-ink-soft mt-1">All lots across the platform with live status.</p>
      </div>
      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No bulk lots are available right now" message="Lots appear after coordinators verify produce and aggregation runs." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Lot</th><th>Crop</th><th>Total</th><th>Available</th><th>Price/kg</th><th>Farmers</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data!.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.lot_code}</td>
                  <td>{l.crop_name}</td>
                  <td>{kg(l.total_quantity_kg)}</td>
                  <td>{kg(l.remaining_kg)}</td>
                  <td>{rupees(l.buyer_price_per_kg)}</td>
                  <td>{l.farmer_count}</td>
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
