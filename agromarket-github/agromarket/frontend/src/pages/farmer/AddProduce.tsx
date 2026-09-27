import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { Spinner } from "../../components/common/ui";

export default function AddProduce() {
  const { toast, overlay } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [imageName, setImageName] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const required = ["crop_name", "quantity_kg", "expected_price_per_kg", "village", "pickup_location", "available_from"];
    const missing = required.filter((k) => !String(form[k] ?? "").trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.replace(/_/g, " ")).join(", ")}`);
      return;
    }
    if (parseFloat(form.quantity_kg) <= 0 || parseFloat(form.expected_price_per_kg) <= 0) {
      setError("Quantity and price must be greater than zero.");
      return;
    }

    setBusy(true);
    overlay.show("Submitting produce...", "Adding your listing for verification");
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
      toast("Produce listing created successfully. It will be verified by your village coordinator.");
      navigate("/farmer/produce");
    } catch (err: any) {
      setError(err.message ?? "Unable to create listing. Please try again.");
      toast("Unable to create listing. Please try again.", "error");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Produce</h1>
        <p className="text-sm text-ink-soft mt-1">
          Your coordinator will physically verify the listing before it joins a bulk lot.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label className="label" htmlFor="crop_name">Crop Name</label>
          <input id="crop_name" className="input" placeholder="e.g. Tomato" value={form.crop_name ?? ""} onChange={set("crop_name")} />
        </div>
        <div>
          <label className="label" htmlFor="quantity_kg">Quantity (kg)</label>
          <input id="quantity_kg" type="number" min="1" className="input" placeholder="e.g. 50" value={form.quantity_kg ?? ""} onChange={set("quantity_kg")} />
        </div>
        <div>
          <label className="label" htmlFor="expected_price_per_kg">Expected Price (₹ per kg)</label>
          <input id="expected_price_per_kg" type="number" step="0.5" min="1" className="input" placeholder="e.g. 25" value={form.expected_price_per_kg ?? ""} onChange={set("expected_price_per_kg")} />
        </div>
        <div>
          <label className="label" htmlFor="available_from">Availability Date</label>
          <input id="available_from" type="date" className="input" value={form.available_from ?? ""} onChange={set("available_from")} />
        </div>
        <div>
          <label className="label" htmlFor="village">Village</label>
          <input id="village" className="input" placeholder="e.g. Kondapur" value={form.village ?? ""} onChange={set("village")} />
        </div>
        <div>
          <label className="label" htmlFor="pickup_location">Pickup Location</label>
          <input id="pickup_location" className="input" placeholder="e.g. Kondapur Village Center" value={form.pickup_location ?? ""} onChange={set("pickup_location")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="image">Produce Image (optional)</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-primary-accent/15 file:px-3 file:py-1.5 file:text-primary file:text-sm"
            onChange={(e) => setImageName(e.target.files?.[0]?.name ?? null)}
          />
          {imageName && <p className="text-xs text-ink-soft mt-1">Selected: {imageName} (demo upload)</p>}
        </div>
        {error && <p className="field-error sm:col-span-2" role="alert">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} Submit Produce
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
