import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Payment } from "../../types";

export default function FarmerPayments() {
  const { data, loading, error, retry } = useAsyncData<Payment[]>(() => api("/api/payments/farmer/mine"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-ink-soft mt-1">Your earnings from orders on lots containing your produce.</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No payments yet" message="Payments appear once buyers complete orders on your lots." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Crop</th><th>Qty</th><th>Your Earnings</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {data!.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.order_code}</td>
                  <td>{p.crop_name}</td>
                  <td>{kg(p.quantity_kg)}</td>
                  <td className="font-semibold text-primary-dark">{rupees(p.farmer_amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-xs text-ink-soft">{p.transaction_ref ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-soft">Simulated payment records for demonstration — not real money transfers.</p>
    </div>
  );
}
