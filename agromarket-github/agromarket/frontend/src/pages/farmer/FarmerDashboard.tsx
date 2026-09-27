import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton, StatusBadge, SummaryCards } from "../../components/common/ui";
import type { DashboardData } from "../../types";

export default function FarmerDashboard() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<DashboardData>(() => api("/api/dashboard"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-soft mt-1">Here's an overview of your produce and sales.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <SummaryCards cards={data!.cards} />
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Orders</h2>
              <Link to="/farmer/orders" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {(data!.extra.recent_orders as any[])?.length ? (
              <div className="table-wrap mt-4">
                <table className="table">
                  <thead>
                    <tr><th>Order</th><th>Crop</th><th>Qty</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {(data!.extra.recent_orders as any[]).map((o) => (
                      <tr key={o.order_code}>
                        <td className="font-medium">{o.order_code}</td>
                        <td>{o.crop}</td>
                        <td>{o.qty} kg</td>
                        <td>₹{o.total.toLocaleString("en-IN")}</td>
                        <td><StatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">No orders yet — verified produce will appear here once buyers order.</p>
            )}
          </div>
          <div className="card p-6 flex items-start gap-3 bg-primary-accent/5 border-primary-accent/30">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">Tip:</span> the earnings figure is an estimate based on your share of
              each lot. See <Link to="/farmer/payments" className="text-primary hover:underline">Payments</Link> for the
              per-order breakdown.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
