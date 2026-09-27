import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  EmptyState, ErrorState, Modal, Spinner, StatusBadge, TableSkeleton, kg, rupees,
} from "../../components/common/ui";
import type { DriverMatch, Order } from "../../types";

export default function BuyerOrders() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<Order[]>(() => api("/api/orders/mine"), []);
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<DriverMatch | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const openDetail = async (o: Order) => {
    setDetail(o);
    setMatch(null);
    try {
      const d = await api<Order>(`/api/orders/${o.id}`);
      setDetail(d);
    } catch { /* keep list item */ }
  };

  const findDrivers = async () => {
    if (!detail) return;
    setMatchLoading(true);
    try {
      const m = await api<DriverMatch>(`/api/matching/drivers/${detail.id}`);
      setMatch(m);
    } catch (err: any) {
      toast(err.message ?? "Unable to find drivers.", "error");
    } finally {
      setMatchLoading(false);
    }
  };

  const assignDriver = async (driverId: number, vehicleId: number) => {
    if (!detail) return;
    setAssigning(true);
    overlay.show("Assigning Driver...", "Confirming vehicle and availability");
    try {
      await api(`/api/matching/drivers/${detail.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ driver_id: driverId, vehicle_id: vehicleId }),
      });
      toast("Driver assigned. The driver will confirm pickup shortly.");
      const d = await api<Order>(`/api/orders/${detail.id}`);
      setDetail(d);
      setMatch(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to assign driver.", "error");
    } finally {
      setAssigning(false);
      overlay.hide();
    }
  };

  const cancelOrder = async () => {
    if (!detail) return;
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setBusy(true);
    try {
      await api(`/api/orders/${detail.id}/cancel`, { method: "POST" });
      toast("Order cancelled. Reserved quantity returned to the lot.");
      setDetail(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to cancel order.", "error");
    } finally {
      setBusy(false);
    }
  };

  const canMatch = detail && ["pending", "confirmed"].includes(detail.status) && !detail.delivery_status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-ink-soft mt-1">Track orders, arrange delivery and manage payments.</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No orders yet" message="Browse the marketplace to place your first bulk order." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Crop</th><th>Qty</th><th>Total</th><th>Payment link</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {data!.map((o) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.order_code}</td>
                  <td>{o.lot_crop_name}</td>
                  <td>{kg(o.quantity_kg)}</td>
                  <td>{rupees(o.total_amount)}</td>
                  <td><StatusBadge status={o.delivery_status ?? "pending"} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openDetail(o)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detail} title={detail ? `Order ${detail.order_code}` : ""} onClose={() => setDetail(null)} width="max-w-2xl">
        {detail && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Info k="Crop" v={detail.lot_crop_name ?? "—"} />
              <Info k="Quantity" v={kg(detail.quantity_kg)} />
              <Info k="Pickup" v={detail.lot_pickup_location ?? "—"} />
              <Info k="Order status" v={<StatusBadge status={detail.status} />} />
              <Info k="Delivery" v={<StatusBadge status={detail.delivery_status ?? "pending"} />} />
              <Info k="Placed" v={new Date(detail.created_at).toLocaleDateString("en-IN")} />
            </div>

            <div className="rounded-xl border border-line p-4 text-sm space-y-1.5">
              <p className="font-medium mb-1">Transaction breakdown</p>
              <Row k={`Farmer price × ${detail.quantity_kg} kg`} v={rupees(detail.farmer_price_per_kg * detail.quantity_kg)} />
              <Row k={`Transportation × ${detail.quantity_kg} kg`} v={rupees(detail.transport_cost_per_kg * detail.quantity_kg)} />
              <Row k={`Platform fee × ${detail.quantity_kg} kg`} v={rupees(detail.platform_fee_per_kg * detail.quantity_kg)} />
              <div className="border-t border-line pt-1.5 flex justify-between font-semibold text-primary-dark">
                <span>Total buyer price</span><span>{rupees(detail.total_amount)}</span>
              </div>
            </div>

            {canMatch && (
              <div className="rounded-xl bg-primary-accent/10 border border-primary-accent/30 p-4">
                <p className="text-sm font-medium">Transport arrangement</p>
                <p className="text-xs text-ink-soft mt-0.5 mb-3">Find a suitable driver for this delivery.</p>
                <button className="btn-primary" onClick={findDrivers} disabled={matchLoading}>
                  {matchLoading && <Spinner className="h-4 w-4" />} Finding a Suitable Driver...
                </button>
                {match && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm">{match.message}</p>
                    {match.candidates.map((c) => (
                      <div key={c.driver_id} className="flex items-center justify-between rounded-lg border border-line bg-white p-3 text-sm">
                        <div>
                          <p className="font-medium">
                            {c.driver_name}
                            {c.driver_id === match.recommended_driver_id && <span className="badge-green ml-2">Recommended</span>}
                          </p>
                          <p className="text-xs text-ink-soft">
                            {c.vehicle_type} · {c.registration_number} · {c.capacity_kg} kg · area match {Math.round(c.distance_score * 100)}%
                          </p>
                        </div>
                        <button className="btn-primary !py-1.5 text-xs" onClick={() => assignDriver(c.driver_id, c.vehicle_id)} disabled={assigning}>
                          Assign
                        </button>
                      </div>
                    ))}
                    {!match.candidates.length && (
                      <p className="text-sm text-ink-soft">No suitable driver is available right now. An admin can assign one manually.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {detail.status !== "completed" && detail.status !== "cancelled" && (
                <button className="btn-danger" onClick={cancelOrder} disabled={busy}>Cancel Order</button>
              )}
              <button className="btn-secondary ml-auto" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
      <span className="text-ink-soft">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-soft">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
