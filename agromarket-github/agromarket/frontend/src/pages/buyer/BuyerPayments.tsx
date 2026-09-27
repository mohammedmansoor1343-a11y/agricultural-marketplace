import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Payment } from "../../types";

export default function BuyerPayments() {
  const { toast } = useApp();
  const { data, loading, error, retry } = useAsyncData<Payment[]>(() => api("/api/payments/mine"), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  const act = async (p: Payment, action: string) => {
    setBusyId(p.id);
    try {
      await api(`/api/payments/${p.id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      toast(
        action === "pay"
          ? "Payment completed (simulated). Transaction reference generated."
          : `Payment marked as ${action} (simulated).`,
        action === "fail" ? "error" : "success"
      );
      retry();
    } catch (err: any) {
      toast(err.message ?? "Payment action failed.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-ink-soft mt-1">Transparent breakdown of every order payment.</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No payments yet" message="Payment records are created when you place an order." />
      ) : (
        <div className="space-y-4">
          {data!.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.order_code} <span className="text-ink-soft font-normal">· {p.crop_name} · {kg(p.quantity_kg)}</span></p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {p.transaction_ref ? `Ref: ${p.transaction_ref} · ` : ""}Simulated payment record
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
                <Cell k="Farmer price" v={rupees(p.farmer_amount)} />
                <Cell k="Transportation" v={rupees(p.transport_amount)} />
                <Cell k="Platform fee" v={rupees(p.platform_fee_amount)} />
                <Cell k="Total" v={rupees(p.amount)} strong />
              </div>
              <div className="mt-4 flex gap-2">
                {p.status === "pending" && (
                  <button className="btn-primary text-xs" onClick={() => act(p, "pay")} disabled={busyId === p.id}>Pay Now (Simulated)</button>
                )}
                {p.status === "processing" && (
                  <button className="btn-primary text-xs" onClick={() => act(p, "pay")} disabled={busyId === p.id}>Complete Payment</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <p className="text-xs text-ink-soft">{k}</p>
      <p className={`font-medium ${strong ? "text-primary-dark" : ""}`}>{v}</p>
    </div>
  );
}
