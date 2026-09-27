import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { BulkLot, Order } from "../../types";

export default function AdminOrders() {
  const { data, loading, error, retry } = useAsyncData<any[]>(async () => {
    // Admin: derive orders from all lots
    const lots = await api<BulkLot[]>("/api/lots");
    const orders: Order[] = [];
    for (const lot of lots) {
      const list = await api<Order[]>(`/api/orders/lot/${lot.id}`);
      orders.push(...list);
    }
    return orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-ink-soft mt-1">All orders across the platform.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No orders yet" message="Orders appear as buyers purchase from lots." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Crop</th><th>Buyer</th><th>Qty</th><th>Total</th><th>Delivery</th><th>Status</th></tr></thead>
            <tbody>
              {data!.map((o: Order) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.order_code}</td>
                  <td>{o.lot_crop_name}</td>
                  <td>{o.buyer_name}</td>
                  <td>{kg(o.quantity_kg)}</td>
                  <td>{rupees(o.total_amount)}</td>
                  <td><StatusBadge status={o.delivery_status ?? "pending"} /></td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
