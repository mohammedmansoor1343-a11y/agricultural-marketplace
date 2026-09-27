import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";

interface EarningRow {
  order_code: string;
  amount: number;
  status: string;
  transaction_ref: string;
  crop_name: string;
  quantity_kg: number;
}

export default function DriverEarnings() {
  const { data, loading, error, retry } = useAsyncData<EarningRow[]>(() => api("/api/payments/driver/earnings"), []);
  const total = (data ?? []).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-ink-soft mt-1">Delivery payments from completed work (simulated).</p>
      </div>

      <div className="card p-6">
        <p className="text-sm text-ink-soft">Total earnings</p>
        <p className="mt-1 text-3xl font-bold text-primary-dark">{rupees(total)}</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No earnings yet" message="Complete deliveries to see payments here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Crop</th><th>Load</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>
              {data!.map((e, i) => (
                <tr key={i}>
                  <td className="font-medium">{e.order_code}</td>
                  <td>{e.crop_name}</td>
                  <td>{kg(e.quantity_kg)}</td>
                  <td className="font-semibold text-primary-dark">{rupees(e.amount)}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="text-xs text-ink-soft">{e.transaction_ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
