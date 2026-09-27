import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton, StatusBadge, SummaryCards } from "../../components/common/ui";
import type { DashboardData } from "../../types";

export default function DriverDashboard() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<DashboardData>(() => api("/api/dashboard"), []);
  const active = (data?.extra.active_jobs ?? []) as { delivery_code: string; pickup: string; drop: string; status: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-soft mt-1">Your delivery work at a glance.</p>
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
            <h2 className="font-semibold">Active Deliveries</h2>
            {active.length ? (
              <ul className="mt-3 divide-y divide-line">
                {active.map((j) => (
                  <li key={j.delivery_code} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <span><b>{j.delivery_code}</b> · {j.pickup} → {j.drop}</span>
                    <StatusBadge status={j.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">No active deliveries — check Available Deliveries for new jobs.</p>
            )}
          </div>
          <p className="text-xs text-ink-soft">
            Availability: {data!.extra.is_available ? "You are marked available for new jobs." : "You are on an active delivery."}
          </p>
        </>
      )}
    </div>
  );
}
