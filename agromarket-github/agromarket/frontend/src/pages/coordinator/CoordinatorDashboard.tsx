import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton, SummaryCards } from "../../components/common/ui";
import type { DashboardData } from "../../types";

export default function CoordinatorDashboard() {
  const { user } = useApp();
  const { data, loading, error, retry } = useAsyncData<DashboardData>(() => api("/api/dashboard"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-soft mt-1">Support farmers in your village with listings and verification.</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/coordinator/verify" className="card p-6 hover:shadow-pop transition-shadow">
              <p className="font-semibold text-primary-dark">Verify Produce →</p>
              <p className="text-sm text-ink-soft mt-1">Review pending listings, record verified weight and approve for aggregation.</p>
            </Link>
            <Link to="/coordinator/add-produce" className="card p-6 hover:shadow-pop transition-shadow">
              <p className="font-semibold text-primary-dark">Add Produce for a Farmer →</p>
              <p className="text-sm text-ink-soft mt-1">Help farmers who cannot use the platform list their harvest.</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
