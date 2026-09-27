import { useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { Spinner } from "../../components/common/ui";

export default function RegisterFarmer() {
  const { toast, overlay } = useApp();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const required = ["full_name", "phone", "village", "district"];
    const missing = required.filter((k) => !form[k]?.trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.replace(/_/g, " ")).join(", ")}`);
      return;
    }
    setBusy(true);
    overlay.show("Registering Farmer...", "Creating their account");
    try {
      await api("/api/produce/coordinator/farmers", { method: "POST", body: JSON.stringify(form) });
      toast("Farmer registered successfully.");
      setForm({});
      setTempPassword("Shared with the farmer by the coordinator office (demo).");
    } catch (err: any) {
      setError(err.message ?? "Unable to register farmer.");
      toast(err.message ?? "Unable to register farmer.", "error");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Register Farmer</h1>
        <p className="text-sm text-ink-soft mt-1">Create an account for a farmer who cannot self-register.</p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="full_name">Farmer Name</label>
          <input id="full_name" className="input" value={form.full_name ?? ""} onChange={set("full_name")} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone Number</label>
          <input id="phone" className="input" placeholder="10-digit mobile" value={form.phone ?? ""} onChange={set("phone")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="village">Village</label>
            <input id="village" className="input" value={form.village ?? ""} onChange={set("village")} />
          </div>
          <div>
            <label className="label" htmlFor="district">District</label>
            <input id="district" className="input" value={form.district ?? ""} onChange={set("district")} />
          </div>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} Register Farmer
        </button>
        {tempPassword && (
          <p className="text-sm rounded-lg bg-canvas p-3 text-ink-soft">{tempPassword}</p>
        )}
      </form>
    </div>
  );
}
