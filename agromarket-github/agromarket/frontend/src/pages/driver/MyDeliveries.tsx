import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, Modal, StatusBadge, kg, rupees, Spinner } from "../../components/common/ui";
import type { Delivery } from "../../types";

const NEXT_STEP: Record<string, { label: string; action: string; needsWeight?: boolean }> = {
  accepted: { label: "Confirm Arrival at Pickup", action: "arrive-pickup" },
  at_pickup: { label: "Confirm Pickup (enter weight)", action: "confirm-pickup", needsWeight: true },
  pickup_confirmed: { label: "Start Transit", action: "start-transit" },
  in_transit: { label: "Confirm Delivery", action: "confirm-delivery" },
  delivered: { label: "Complete Delivery", action: "complete" },
};

export default function MyDeliveries() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<Delivery[]>(() => api("/api/deliveries/mine"), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [weightFor, setWeightFor] = useState<Delivery | null>(null);
  const [weight, setWeight] = useState("");

  const active = (data ?? []).filter((d) => NEXT_STEP[d.status]);

  const step = async (d: Delivery) => {
    const cfg = NEXT_STEP[d.status];
    if (!cfg) return;
    if (cfg.needsWeight) {
      setWeightFor(d);
      setWeight("");
      return;
    }
    setBusyId(d.id);
    try {
      await api(`/api/deliveries/${d.id}/${cfg.action}`, { method: "POST", body: JSON.stringify({}) });
      toast(`Status updated: ${cfg.label.replace(" (enter weight)", "")}.`);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to update delivery.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmPickup = async () => {
    if (!weightFor) return;
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      toast("Enter the actual produce weight.", "error");
      return;
    }
    setBusyId(weightFor.id);
    overlay.show("Confirming Pickup...", "Recording verified weight");
    try {
      await api(`/api/deliveries/${weightFor.id}/confirm-pickup`, {
        method: "POST",
        body: JSON.stringify({ actual_weight_kg: w }),
      });
      toast(`Pickup confirmed at ${w} kg.`);
      setWeightFor(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to confirm pickup.", "error");
    } finally {
      setBusyId(null);
      overlay.hide();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Deliveries</h1>
        <p className="text-sm text-ink-soft mt-1">Update status as you progress through each job.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : active.length === 0 ? (
        <EmptyState title="No active deliveries" message="Accept a job from Available Deliveries to get started." />
      ) : (
        <div className="space-y-4">
          {active.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.delivery_code} · {d.crop_name} · {kg(d.load_kg)}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{d.pickup_location} → {d.drop_location} · Order {d.order_code}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" onClick={() => step(d)} disabled={busyId === d.id}>
                  {busyId === d.id && <Spinner className="h-4 w-4" />} {NEXT_STEP[d.status].label}
                </button>
                <span className="text-sm text-ink-soft">Est. earnings {rupees(d.estimated_earnings)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!weightFor} title="Enter actual produce weight" onClose={() => setWeightFor(null)}>
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">Weigh the produce at pickup and enter the verified figure.</p>
          <div>
            <label className="label" htmlFor="weight">Actual weight (kg)</label>
            <input id="weight" type="number" min="1" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={confirmPickup}>Confirm Pickup</button>
            <button className="btn-secondary" onClick={() => setWeightFor(null)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
