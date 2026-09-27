import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Order } from "../../types";

export default function FarmerOrders() {
  const { data, loading, error, retry } = useAsyncData<Order[]>(() => api("/api/orders/for-farmer"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-ink-soft mt-1">Orders that include produce from your listings.</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No orders yet" message="When buyers order from lots containing your produce, they appear here." />
      ) : (
        <div className="space-y-4">
          {data!.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="font-semibold">{o.order_code} <span className="text-ink-soft font-normal">· {o.lot_crop_name}</span></p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {kg(o.quantity_kg)} · Buyer: {o.buyer_name ?? "—"} ({o.buyer_business ?? "—"})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{rupees(o.total_amount)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-3 grid grid-cols-3 gap-2 text-xs text-ink-soft">
                <span>Farmer price: <b className="text-ink">{rupees(o.farmer_price_per_kg)}/kg</b></span>
                <span>Transport: <b className="text-ink">{rupees(o.transport_cost_per_kg)}/kg</b></span>
                <span>Platform fee: <b className="text-ink">{rupees(o.platform_fee_per_kg)}/kg</b></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
