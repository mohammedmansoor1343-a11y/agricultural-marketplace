import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton, StatusBadge, SummaryCards } from "../../components/common/ui";
import type { DashboardData } from "../../types";

export default function BuyerDashboard() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<DashboardData>(() => api("/api/dashboard"), []);
  const prices = (data?.extra.crop_prices ?? []) as { crop_name: string; current_price: number; trend_percent: number; trend_direction: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-soft mt-1">Your sourcing overview and today's crop signals.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <SummaryCards cards={data!.cards} />

          <div className="card p-6">
            <h2 className="font-semibold">Crop Price Signals</h2>
            <p className="text-xs text-ink-soft mt-0.5">Sample data estimates — not real market prices.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {prices.map((p) => (
                <div key={p.crop_name} className="rounded-xl border border-line p-4">
                  <p className="font-medium">{p.crop_name}</p>
                  <p className="mt-1 text-xl font-semibold text-primary-dark">₹{p.current_price}/kg</p>
                  <p className="mt-1 text-xs flex items-center gap-1">
                    {p.trend_direction === "up" ? <ArrowUp size={13} className="text-emerald-600" />
                      : p.trend_direction === "down" ? <ArrowDown size={13} className="text-red-600" />
                      : <Minus size={13} className="text-gray-500" />}
                    <span className="text-ink-soft">{p.trend_percent > 0 ? "+" : ""}{p.trend_percent}% this week</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Orders</h2>
              <Link to="/buyer/orders" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {(data!.extra.recent_orders as any[])?.length ? (
              <div className="table-wrap mt-4">
                <table className="table">
                  <thead><tr><th>Order</th><th>Crop</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
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
              <p className="mt-4 text-sm text-ink-soft">No orders yet — browse the marketplace to place your first order.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
