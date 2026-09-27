import { useState } from "react";
import { MapPin, Route, Weight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, Modal, kg, rupees } from "../../components/common/ui";
import type { Delivery } from "../../types";

export default function AvailableJobs() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<Delivery[]>(() => api("/api/deliveries/available"), []);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<{ id: number; label: string; ok: boolean }[]>([]);
  const [busy, setBusy] = useState(false);

  const openJob = async (d: Delivery) => {
    setSelected(d);
    setVehicleId(null);
    try {
      const list = await api<any[]>("/api/drivers/me/vehicles");
      setVehicles(
        list.map((v) => ({
          id: v.id,
          label: `${v.vehicle_type} · ${v.registration_number} · ${v.capacity_kg} kg`,
          ok: v.capacity_kg >= d.required_capacity_kg,
        }))
      );
    } catch {
      setVehicles([]);
    }
  };

  const accept = async () => {
    if (!selected || !vehicleId) {
      toast("Select a vehicle for this delivery.", "error");
      return;
    }
    setBusy(true);
    overlay.show("Accepting Delivery...", "Reserving this job for you");
    try {
      await api(`/api/deliveries/${selected.id}/accept?vehicle_id=${vehicleId}`, { method: "POST" });
      toast("Delivery accepted. View it under My Deliveries.");
      setSelected(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to accept delivery.", "error");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Available Deliveries</h1>
        <p className="text-sm text-ink-soft mt-1">Jobs matching your area — accept to start the workflow.</p>
      </div>

      {loading ? (
        <CardSkeletonGrid count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No jobs available right now" message="New deliveries appear here when buyers arrange transport." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map((d) => (
            <div key={d.id} className="card p-5">
              <p className="font-semibold">{d.crop_name} · {kg(d.load_kg)}</p>
              <p className="text-xs text-ink-soft">{d.delivery_code} · needs {kg(d.required_capacity_kg)} capacity</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row icon={<MapPin size={14} />} k="Route" v={`${d.pickup_location} → ${d.drop_location}`} />
                <Row icon={<Route size={14} />} k="Distance" v={`~${d.distance_km} km`} />
                <Row icon={<Weight size={14} />} k="Est. earnings" v={rupees(d.estimated_earnings)} />
              </dl>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => openJob(d)}>View Job</button>
                <button className="btn-primary flex-1" onClick={() => openJob(d)}>Accept Delivery</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} title={selected ? `Job ${selected.delivery_code}` : ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-canvas p-4 space-y-1.5">
              <Row k="Crop" v={selected.crop_name} />
              <Row k="Load" v={kg(selected.load_kg)} />
              <Row k="Required capacity" v={kg(selected.required_capacity_kg)} />
              <Row k="Route" v={`${selected.pickup_location} → ${selected.drop_location}`} />
              <Row k="Distance" v={`~${selected.distance_km} km`} />
              <Row k="Estimated earnings" v={rupees(selected.estimated_earnings)} />
            </div>
            <div>
              <label className="label" htmlFor="vehicle">Choose your vehicle</label>
              {vehicles.length ? (
                <select id="vehicle" className="input" value={vehicleId ?? ""} onChange={(e) => setVehicleId(Number(e.target.value))}>
                  <option value="" disabled>Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id} disabled={!v.ok}>
                      {v.label}{!v.ok ? " — capacity too low" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-ink-soft">Loading vehicles...</p>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={accept} disabled={busy}>Confirm Accept</button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ icon, k, v }: { icon?: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft flex items-center gap-1.5">{icon} {k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}
