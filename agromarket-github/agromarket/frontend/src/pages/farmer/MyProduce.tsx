import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg } from "../../components/common/ui";
import type { ProduceListing } from "../../types";

export default function MyProduce() {
  const { data, loading, error, retry } = useAsyncData<ProduceListing[]>(() => api("/api/produce/mine"), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Produce</h1>
          <p className="text-sm text-ink-soft mt-1">Track verification status of your listings.</p>
        </div>
        <Link to="/farmer/produce/add" className="btn-primary"><Plus size={16} /> Add Produce</Link>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState
          title="No produce listed yet"
          message="Add your first listing to join bulk lots and reach buyers."
          icon={<Plus size={28} />}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Crop</th><th>Quantity</th><th>Expected Price</th><th>Status</th><th>Available From</th><th>Village</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.crop_name}</td>
                  <td>{kg(l.quantity_kg)}</td>
                  <td>₹{l.expected_price_per_kg}/kg</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{l.available_from}</td>
                  <td>{l.village}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
