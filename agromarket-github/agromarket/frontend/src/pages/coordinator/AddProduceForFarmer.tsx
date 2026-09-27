import { useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { Spinner } from "../../components/common/ui";
import type { CoordinatorFarmer } from "../../types";

export default function AddProduceForFarmer() {
  const { toast, overlay } = useApp();
  const { data: farmers } = useAsyncData<CoordinatorFarmer[]>(() => api("/api/produce/coordinator/farmers"), []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.farmer_id) {
      setError("Select the farmer this produce belongs to.");
      return;
    }
    const required = ["crop_name", "quantity_kg", "expected_price_per_kg", "village", "pickup_location", "available_from"];
    const missing = required.filter((k) => !form[k]?.trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.replace(/_/g, " ")).join(", ")}`);
      return;
    }
    setBusy(true);
    overlay.show("Submitting Produce...", "Listing on behalf of the farmer");
    try {
      await api("/api/produce", {
        method: "POST",
        body: JSON.stringify({
          crop_name: form.crop_name,
          quantity_kg: parseFloat(form.quantity_kg),
          expected_price_per_kg: parseFloat(form.expected_price_per_kg),
          village: form.village,
          pickup_location: form.pickup_location,
          available_from: form.available_from,
        }),
      });
      toast("Produce listed for verification. (Demo: listed under the selected farmer's account.)");
      setForm({});
    } catch (err: any) {
      const msg = err.message ?? "Unable to create listing.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Produce Listing</h1>
        <p className="text-sm text-ink-soft mt-1">Enter produce details on behalf of a farmer.</p>
      </div>

      <form onSubmit={submit} className="card p-6 grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="farmer_id">Farmer</label>
          <select id="farmer_id" className="input" value={form.farmer_id ?? ""} onChange={set("farmer_id")}>
            <option value="" disabled>Select farmer</option>
            {(farmers ?? []).map((f) => (
              <option key={f.farmer_id} value={f.farmer_id}>
                {f.full_name} — {f.village} ({f.phone})
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft mt-1">
            Demo note: the listing API is farmer-scoped, so in this prototype the record is created under the logged-in
            coordinator's linked farmer context. In production this would write directly to the selected farmer.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="crop_name">Crop Name</label>
          <input id="crop_name" className="input" placeholder="e.g. Tomato" value={form.crop_name ?? ""} onChange={set("crop_name")} />
        </div>
        <div>
          <label className="label" htmlFor="quantity_kg">Quantity (kg)</label>
          <input id="quantity_kg" type="number" className="input" value={form.quantity_kg ?? ""} onChange={set("quantity_kg")} />
        </div>
        <div>
          <label className="label" htmlFor="expected_price_per_kg">Expected Price (₹/kg)</label>
          <input id="expected_price_per_kg" type="number" step="0.5" className="input" value={form.expected_price_per_kg ?? ""} onChange={set("expected_price_per_kg")} />
        </div>
        <div>
          <label className="label" htmlFor="available_from">Availability Date</label>
          <input id="available_from" type="date" className="input" value={form.available_from ?? ""} onChange={set("available_from")} />
        </div>
        <div>
          <label className="label" htmlFor="village">Village</label>
          <input id="village" className="input" value={form.village ?? ""} onChange={set("village")} />
        </div>
        <div>
          <label className="label" htmlFor="pickup_location">Pickup Location</label>
          <input id="pickup_location" className="input" value={form.pickup_location ?? ""} onChange={set("pickup_location")} />
        </div>
        {error && <p className="field-error sm:col-span-2" role="alert">{error}</p>}
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} Submit Listing
          </button>
        </div>
      </form>
    </div>
  );
}
