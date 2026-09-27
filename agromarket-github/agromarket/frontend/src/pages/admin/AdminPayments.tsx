import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Payment } from "../../types";

export default function AdminPayments() {
  const { toast } = useApp();
  const { data, loading, error, retry } = useAsyncData<Payment[]>(() => api("/api/payments/all"), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  const act = async (p: Payment, action: string) => {
    setBusyId(p.id);
    try {
      await api(`/api/payments/${p.id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      toast(`Payment ${action === "pay" ? "marked paid" : action + "ed"} (simulated).`);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Action failed.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-ink-soft mt-1">All payment records with full transaction breakdowns (simulated).</p>
      </div>
      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No payments yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Buyer</th><th>Crop</th><th>Farmer Amt</th><th>Transport</th><th>Fee</th><th>Total</th><th>Status</th><th>Ref</th><th></th></tr></thead>
            <tbody>
              {data!.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.order_code}</td>
                  <td className="text-xs">{p.buyer_name}</td>
                  <td className="text-xs">{p.crop_name} · {kg(p.quantity_kg ?? 0)}</td>
                  <td>{rupees(p.farmer_amount)}</td>
                  <td>{rupees(p.transport_amount)}</td>
                  <td>{rupees(p.platform_fee_amount)}</td>
                  <td className="font-semibold">{rupees(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-xs text-ink-soft">{p.transaction_ref ?? "—"}</td>
                  <td>
                    {p.status === "pending" && (
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => act(p, "pay")} disabled={busyId === p.id}>Mark Paid</button>
                    )}
                    {p.status === "paid" && (
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => act(p, "refund")} disabled={busyId === p.id}>Refund</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
