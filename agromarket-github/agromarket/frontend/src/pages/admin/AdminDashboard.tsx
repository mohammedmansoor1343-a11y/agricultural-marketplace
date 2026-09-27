import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton, SummaryCards } from "../../components/common/ui";
import type { DashboardData } from "../../types";

export default function AdminDashboard() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<DashboardData>(() => api("/api/dashboard"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-ink-soft mt-1">Signed in as {user?.full_name} (admin).</p>
      </div>
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <SummaryCards cards={data!.cards} />
      )}
    </div>
  );
}
