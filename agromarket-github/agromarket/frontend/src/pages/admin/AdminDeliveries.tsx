import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, Modal, StatusBadge, TableSkeleton, kg, rupees } from "../../components/common/ui";
import type { Delivery } from "../../types";

export default function AdminDeliveries() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<Delivery[]>(() => api("/api/deliveries/all"), []);
  const [assigning, setAssigning] = useState<Delivery | null>(null);
  const [candidates, setCandidates] = useState<{ driver_id: number; driver_name: string; vehicle_id: number; vehicle_type: string; registration_number: string; capacity_kg: number; match_score: number }[]>([]);
  const [loadingC, setLoadingC] = useState(false);

  const openAssign = async (d: Delivery) => {
    setAssigning(d);
    setLoadingC(true);
    try {
      const m = await api<any>(`/api/matching/drivers/${d.order_id}`);
      setCandidates(m.candidates ?? []);
    } catch {
      setCandidates([]);
    } finally {
      setLoadingC(false);
    }
  };

  const assign = async (driverId: number, vehicleId: number) => {
    if (!assigning) return;
    overlay.show("Assigning Driver...", "Updating the delivery");
    try {
      await api(`/api/matching/drivers/${assigning.order_id}/assign`, {
        method: "POST",
        body: JSON.stringify({ driver_id: driverId, vehicle_id: vehicleId }),
      });
      toast("Driver assigned manually.");
      setAssigning(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to assign driver.", "error");
    } finally {
      overlay.hide();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-ink-soft mt-1">Monitor all deliveries; assign drivers manually when needed.</p>
      </div>
      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No deliveries yet" message="Deliveries are created with each order." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Delivery</th><th>Route</th><th>Load</th><th>Driver</th><th>Earnings</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data!.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.delivery_code}<br /><span className="text-xs text-ink-soft">{d.order_code}</span></td>
                  <td className="max-w-[240px] text-xs">{d.pickup_location} → {d.drop_location}</td>
                  <td>{kg(d.load_kg)}</td>
                  <td className="text-xs">{d.driver_name ?? <span className="badge-amber">Unassigned</span>}</td>
                  <td>{rupees(d.actual_earnings ?? d.estimated_earnings)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    {d.status === "pending" && (
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openAssign(d)}>Assign Driver</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!assigning} title={assigning ? `Assign driver — ${assigning.delivery_code}` : ""} onClose={() => setAssigning(null)}>
        {loadingC ? (
          <p className="text-sm text-ink-soft">Checking vehicle capacity and availability...</p>
        ) : candidates.length ? (
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.driver_id} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                <div>
                  <p className="font-medium">{c.driver_name} <span className="text-ink-soft">· score {c.match_score}</span></p>
                  <p className="text-xs text-ink-soft">{c.vehicle_type} · {c.registration_number} · {c.capacity_kg} kg</p>
                </div>
                <button className="btn-primary !py-1.5 text-xs" onClick={() => assign(c.driver_id, c.vehicle_id)}>Assign</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No suitable driver is available right now.</p>
        )}
      </Modal>
    </div>
  );
}
