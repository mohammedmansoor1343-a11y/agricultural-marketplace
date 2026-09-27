import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { CardSkeletonGrid, EmptyState, ErrorState, Modal, kg, rupees, Spinner } from "../../components/common/ui";
import type { ProduceListing } from "../../types";

export default function VerifyProduce() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<ProduceListing[]>(() => api("/api/produce/pending"), []);
  const [selected, setSelected] = useState<ProduceListing | null>(null);
  const [weight, setWeight] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (action: "verify" | "reject") => {
    if (!selected) return;
    if (action === "verify") {
      const w = parseFloat(weight);
      if (!w || w <= 0) {
        toast("Enter the verified weight.", "error");
        return;
      }
    }
    if (action === "reject" && !reason.trim()) {
      toast("Please give a rejection reason.", "error");
      return;
    }
    setBusy(true);
    overlay.show(action === "verify" ? "Verifying Produce..." : "Rejecting Listing...", "Updating the listing status");
    try {
      await api(`/api/produce/${selected.id}/verify`, {
        method: "POST",
        body: JSON.stringify({
          action,
          verified_weight_kg: action === "verify" ? parseFloat(weight) : 0.1,
          verification_photo_url: photoName ? `uploads/${photoName}` : null,
          rejection_reason: action === "reject" ? reason : null,
        }),
      });
      toast(action === "verify" ? "Listing marked as Verified." : "Listing rejected with reason.");
      setSelected(null);
      setWeight("");
      setReason("");
      setPhotoName(null);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Unable to update listing.", "error");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verify Produce</h1>
        <p className="text-sm text-ink-soft mt-1">Only verified listings can join bulk lots.</p>
      </div>

      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No pending verifications" message="New farmer listings will appear here for review." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data!.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{l.crop_name}</h2>
                <span className="badge-amber">Pending</span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row k="Quantity" v={kg(l.quantity_kg)} />
                <Row k="Expected price" v={`${rupees(l.expected_price_per_kg)}/kg`} />
                <Row k="Village" v={l.village} />
                <Row k="Available from" v={l.available_from} />
              </dl>
              <button className="btn-primary w-full mt-4" onClick={() => setSelected(l)}>Review</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} title={selected ? `Verify — ${selected.crop_name}` : ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-canvas p-4 text-sm space-y-1.5">
              <Row k="Farmer listing" v={`#${selected.id}`} />
              <Row k="Claimed quantity" v={kg(selected.quantity_kg)} />
              <Row k="Expected price" v={`${rupees(selected.expected_price_per_kg)}/kg`} />
              <Row k="Pickup location" v={selected.pickup_location} />
            </div>
            <div>
              <label className="label" htmlFor="weight">Verified weight (kg)</label>
              <input id="weight" type="number" min="1" className="input" placeholder="Physical measurement" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="photo">Verification photo (optional)</label>
              <input
                id="photo" type="file" accept="image/*"
                className="input file:mr-3 file:rounded-md file:border-0 file:bg-primary-accent/15 file:px-3 file:py-1.5 file:text-primary file:text-sm"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
              />
            </div>
            <div>
              <label className="label" htmlFor="reason">Rejection reason (required only when rejecting)</label>
              <input id="reason" className="input" placeholder="e.g. Weight does not match claim" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={() => submit("verify")} disabled={busy}>
                {busy && <Spinner className="h-4 w-4" />} Mark as Verified
              </button>
              <button className="btn-danger" onClick={() => submit("reject")} disabled={busy}>Reject</button>
            </div>
          </div>
        )}
      </Modal>
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
