import { useMemo, useState } from "react";
import { MapPin, Sprout, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  CardSkeletonGrid, EmptyState, ErrorState, Modal, StatusBadge, kg, rupees, Spinner,
} from "../../components/common/ui";
import type { BulkLot } from "../../types";

export default function Marketplace() {
  const { toast, overlay } = useApp();
  const { data, loading, error, retry } = useAsyncData<BulkLot[]>(() => api("/api/lots"), []);
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("all");
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [dateFrom, setDateFrom] = useState("");

  const [orderLot, setOrderLot] = useState<BulkLot | null>(null);
  const [qty, setQty] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const crops = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.crop_name))), [data]);

  const lots = (data ?? []).filter((l) => {
    if (l.status !== "ready" && l.status !== "collecting") return false;
    if (crop !== "all" && l.crop_name !== crop) return false;
    if (search && !`${l.crop_name} ${l.lot_code} ${l.pickup_location}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (location && !l.pickup_location.toLowerCase().includes(location.toLowerCase())) return false;
    if (maxPrice && l.buyer_price_per_kg > parseFloat(maxPrice)) return false;
    if (dateFrom && l.available_from < dateFrom) return false;
    return true;
  });

  const placeOrder = async () => {
    if (!orderLot) return;
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      setOrderError("Enter a valid quantity.");
      return;
    }
    if (q > orderLot.remaining_kg) {
      setOrderError(`Only ${orderLot.remaining_kg} kg available in this lot.`);
      return;
    }
    setOrderBusy(true);
    setOrderError(null);
    overlay.show("Processing Order...", "Please wait while we confirm your order");
    try {
      const order = await api<{ order_code: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ lot_id: orderLot.id, quantity_kg: q }),
      });
      overlay.hide();
      setOrderLot(null);
      setQty("");
      toast(`Order ${order.order_code} placed successfully.`);
      window.location.assign("/buyer/orders");
    } catch (err: any) {
      overlay.hide();
      setOrderError(err.message ?? "Unable to place order. Please try again.");
    } finally {
      setOrderBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-ink-soft mt-1">Verified bulk lots ready for order.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder="Search crop or lot..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={crop} onChange={(e) => setCrop(e.target.value)}>
          <option value="all">All crops</option>
          {crops.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" type="number" placeholder="Max price ₹/kg" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Available from" />
      </div>

      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : lots.length === 0 ? (
        <EmptyState title="No bulk lots are available right now" message="Try clearing filters, or check back after the next aggregation run." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lots.map((lot) => (
            <div key={lot.id} className="card p-5 flex flex-col">
              <div className="h-28 rounded-xl bg-gradient-to-br from-primary-accent/25 to-primary/10 flex items-center justify-center text-primary-dark">
                <Sprout size={34} />
              </div>
              <div className="flex items-start justify-between mt-4">
                <div>
                  <h2 className="font-semibold">{lot.crop_name}</h2>
                  <p className="text-xs text-ink-soft">{lot.lot_code} · from {lot.available_from}</p>
                </div>
                <StatusBadge status={lot.status} />
              </div>
              <dl className="mt-3 space-y-1.5 text-sm text-ink-soft flex-1">
                <div className="flex justify-between"><dt>Available</dt><dd className="font-medium text-ink">{kg(lot.remaining_kg)}</dd></div>
                <div className="flex justify-between"><dt>Price</dt><dd className="font-medium text-ink">{rupees(lot.buyer_price_per_kg)}/kg</dd></div>
                <div className="flex justify-between"><dt className="flex items-center gap-1"><MapPin size={13} /> Pickup</dt><dd className="font-medium text-ink text-right">{lot.pickup_location}</dd></div>
                <div className="flex justify-between"><dt className="flex items-center gap-1"><Users size={13} /> Farmers</dt><dd className="font-medium text-ink">{lot.farmer_count}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setOrderLot(lot)}>View Details</button>
                <button className="btn-primary flex-1" onClick={() => { setOrderLot(lot); }}>Place Order</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order / details modal */}
      <Modal open={!!orderLot} title={orderLot ? `Order — ${orderLot.crop_name} (${orderLot.lot_code})` : ""} onClose={() => setOrderLot(null)}>
        {orderLot && (
          <div className="space-y-4">
            <div className="rounded-xl bg-canvas p-4 text-sm space-y-1.5">
              <Row k="Total lot quantity" v={kg(orderLot.total_quantity_kg)} />
              <Row k="Available now" v={kg(orderLot.remaining_kg)} />
              <Row k="Pickup location" v={orderLot.pickup_location} />
              <Row k="Available from" v={orderLot.available_from} />
              <Row k="Farmers contributing" v={String(orderLot.farmer_count)} />
              <Row k="Verification" v="Coordinator-verified produce" />
            </div>

            <div>
              <label className="label" htmlFor="qty">Required quantity (kg)</label>
              <input
                id="qty" type="number" min="1" className="input"
                placeholder={`Up to ${orderLot.remaining_kg}`}
                value={qty} onChange={(e) => setQty(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-line p-4 text-sm space-y-1.5">
              <p className="font-medium mb-1">Price breakdown (per kg)</p>
              <Row k="Farmer price" v={rupees(orderLot.price_per_kg)} />
              <Row k="Transportation" v={rupees(orderLot.transport_cost_per_kg)} />
              <Row k="Platform fee" v={rupees(orderLot.platform_fee_per_kg)} />
              <div className="border-t border-line pt-1.5 flex justify-between font-semibold text-primary-dark">
                <span>Buyer price</span><span>{rupees(orderLot.buyer_price_per_kg)}/kg</span>
              </div>
              {qty && parseFloat(qty) > 0 && (
                <div className="border-t border-line pt-1.5 flex justify-between font-semibold">
                  <span>Estimated total</span>
                  <span>{rupees(parseFloat(qty) * orderLot.buyer_price_per_kg)}</span>
                </div>
              )}
            </div>

            {orderError && <p className="field-error" role="alert">{orderError}</p>}
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={placeOrder} disabled={orderBusy}>
                {orderBusy ? <Spinner className="h-4 w-4" /> : null} Confirm Order
              </button>
              <button className="btn-secondary" onClick={() => setOrderLot(null)}>Cancel</button>
            </div>
            <p className="text-[11px] text-ink-soft">Payment is simulated in this prototype — no real money moves.</p>
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
