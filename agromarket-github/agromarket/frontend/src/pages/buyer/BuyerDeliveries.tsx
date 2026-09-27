import { Truck } from "lucide-react";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, StatusBadge, kg } from "../../components/common/ui";
import type { Delivery } from "../../types";

export default function BuyerDeliveries() {
  const { data, loading, error, retry } = useAsyncData<Delivery[]>(() => api("/api/deliveries/for-buyer"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-ink-soft mt-1">Live status of your incoming produce.</p>
      </div>

      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState icon={<Truck size={28} />} title="No deliveries yet" message="Deliveries appear here after you place an order." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{d.delivery_code}</p>
                  <p className="text-xs text-ink-soft">Order {d.order_code} · {d.crop_name}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <dl className="mt-4 space-y-1.5 text-sm">
                <Row k="Route" v={`${d.pickup_location} → ${d.drop_location}`} />
                <Row k="Load" v={kg(d.load_kg)} />
                <Row k="Distance" v={`${d.distance_km} km (est.)`} />
                <Row k="Driver" v={d.driver_name ? `${d.driver_name} (${d.vehicle_type ?? "vehicle"})` : "Awaiting assignment"} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-ink-soft shrink-0">{k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}
