import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, StatusBadge, kg, rupees } from "../../components/common/ui";
import type { BulkLot } from "../../types";

export default function AdminLots() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<BulkLot[]>(() => api("/api/lots"), []);

  const runAggregation = async () => {
    if (!window.confirm("Run aggregation now? Verified listings above the threshold will be combined into bulk lots.")) return;
    overlay.show("Creating Bulk Lot...", "Combining verified produce listings");
    try {
      const res = await api<{ lots_created: BulkLot[]; groups_below_threshold: { crop_name: string; total_verified_kg: number }[] }>(
        "/api/aggregation/run", { method: "POST" }
      );
      toast(res.lots_created.length
        ? `${res.lots_created.length} bulk lot(s) created.`
        : "No new lots — no group currently meets the threshold.", res.lots_created.length ? "success" : "info");
      retry();
    } catch (err: any) {
      toast(err.message ?? "Aggregation failed.", "error");
    } finally {
      overlay.hide();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bulk Lots</h1>
          <p className="text-sm text-ink-soft mt-1">Monitor lots and run AI-based aggregation.</p>
        </div>
        <button className="btn-primary" onClick={runAggregation}>Run Aggregation</button>
      </div>

      {loading ? (
        <CardSkeletonGrid count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No bulk lots yet" message="Run aggregation to combine verified listings into lots." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{l.crop_name} · {l.lot_code}</p>
                  <p className="text-xs text-ink-soft">{l.pickup_location}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Row k="Total" v={kg(l.total_quantity_kg)} />
                <Row k="Remaining" v={kg(l.remaining_kg)} />
                <Row k="Farmers" v={String(l.farmer_count)} />
                <Row k="Farmer price" v={`${rupees(l.price_per_kg)}/kg`} />
              </dl>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-primary">Farmer contributions</summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {l.items.map((i) => (
                    <li key={i.id}>{i.farmer_name ?? `Farmer #${i.farmer_id}`} — {kg(i.allocated_kg)} @ {rupees(i.price_per_kg)}/kg</li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-canvas px-3 py-1.5">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
