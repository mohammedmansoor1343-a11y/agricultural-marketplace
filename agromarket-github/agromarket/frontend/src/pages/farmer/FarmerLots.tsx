import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, StatusBadge, kg, rupees } from "../../components/common/ui";
import type { BulkLot } from "../../types";

export default function FarmerLots() {
  const { data, loading, error, retry } = useAsyncData<BulkLot[]>(() => api("/api/lots"), []);
  const myLots = (data ?? []).filter((l) => l.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Lots</h1>
        <p className="text-sm text-ink-soft mt-1">Lots that include your verified produce.</p>
      </div>

      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : myLots.length === 0 ? (
        <EmptyState
          title="No bulk lots yet"
          message="Once your listing is verified and aggregated with neighbours, the lot appears here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myLots.map((lot) => {
            const mine = lot.items.reduce((s, i) => s + i.allocated_kg, 0);
            return (
              <div key={lot.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{lot.crop_name}</h2>
                    <p className="text-xs text-ink-soft">{lot.lot_code}</p>
                  </div>
                  <StatusBadge status={lot.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Kv k="Your contribution" v={kg(mine)} strong />
                  <Kv k="Lot total" v={kg(lot.total_quantity_kg)} />
                  <Kv k="Farmers" v={String(lot.farmer_count)} />
                  <Kv k="Pickup" v={lot.pickup_location} />
                  <Kv k="Farmer price" v={`${rupees(lot.price_per_kg)}/kg`} />
                  <Kv k="Available from" v={lot.available_from} />
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kv({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{k}</dt>
      <dd className={strong ? "font-semibold text-primary-dark" : "font-medium"}>{v}</dd>
    </div>
  );
}
