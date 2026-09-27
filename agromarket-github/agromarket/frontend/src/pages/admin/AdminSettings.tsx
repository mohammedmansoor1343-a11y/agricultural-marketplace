import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Spinner } from "../../components/common/ui";
import type { SettingsData } from "../../types";

export default function AdminSettings() {
  const { toast } = useApp();
  const { data, loading, error, retry } = useAsyncData<SettingsData>(() => api("/api/settings"), []);
  const [threshold, setThreshold] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setThreshold(String(data.aggregation_threshold_kg));
      setFee(String(data.platform_fee_per_kg));
    }
  }, [data]);

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          aggregation_threshold_kg: parseFloat(threshold),
          platform_fee_per_kg: parseFloat(fee),
        }),
      });
      toast("Settings saved. New aggregation runs will use these values.");
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to save settings.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-ink-soft mt-1">Platform-wide parameters (admin only).</p>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <div className="card p-6 space-y-5">
          <div>
            <label className="label" htmlFor="threshold">Aggregation threshold (kg)</label>
            <input id="threshold" type="number" min="1" className="input" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <p className="text-xs text-ink-soft mt-1">Minimum combined verified quantity for a crop/location group to become a bulk lot.</p>
          </div>
          <div>
            <label className="label" htmlFor="fee">Platform fee (₹ per kg)</label>
            <input id="fee" type="number" min="0" step="0.5" className="input" value={fee} onChange={(e) => setFee(e.target.value)} />
            <p className="text-xs text-ink-soft mt-1">Applied to new lots; shown in the transparency ledger.</p>
          </div>
          <div className="rounded-lg bg-canvas p-3 text-sm text-ink-soft">
            Demo mode: <b className="text-ink">ON</b> — payments are simulated and forecasts use sample data.
          </div>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} Save Settings
          </button>
        </div>
      )}
    </div>
  );
}
