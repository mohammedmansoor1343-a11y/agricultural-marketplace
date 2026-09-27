import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton } from "../../components/common/ui";
import type { PriceSeries } from "../../types";

const CROPS = ["Tomato", "Onion", "Potato", "Chilli"];

export default function PriceTrends() {
  const [crop, setCrop] = useState("Tomato");
  const { data, loading, error, retry } = useAsyncData<PriceSeries>(() => api(`/api/prices/${crop}`), [crop]);

  const chartData = [
    ...(data?.history ?? []).map((h) => ({ week: h.week_start.slice(5), price: h.modal_price_per_kg, kind: "history" })),
    ...(data?.forecast ?? []).map((f) => ({ week: f.week_start.slice(5), price: f.modal_price_per_kg, kind: "forecast" })),
  ];
  const historyCount = data?.history.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Price Trends</h1>
        <p className="text-sm text-ink-soft mt-1">Weekly market prices and estimated future movement.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CROPS.map((c) => (
          <button
            key={c}
            onClick={() => setCrop(c)}
            className={`btn ${crop === c ? "bg-primary text-white" : "bg-white border border-line text-ink hover:bg-canvas"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Current Price</p>
              <p className="mt-1 text-2xl font-semibold text-primary-dark">₹{data!.current_price}/kg</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Estimated Trend</p>
              <p className="mt-1 text-2xl font-semibold flex items-center gap-1.5">
                {data!.trend_direction === "up" ? <ArrowUp size={20} className="text-emerald-600" />
                  : data!.trend_direction === "down" ? <ArrowDown size={20} className="text-red-600" />
                  : <Minus size={20} className="text-gray-500" />}
                {data!.trend_percent != null ? `${data!.trend_percent > 0 ? "+" : ""}${data!.trend_percent}%` : "—"}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Forecast Period</p>
              <p className="mt-1 text-2xl font-semibold">4 weeks</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold">{crop} — Weekly Price</h2>
            <p className="text-xs text-ink-soft mt-1">
              Solid line: recorded sample history · Dashed line: model estimate (not real market prices)
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toFixed(2)}/kg`]} />
                  <Legend />
                  <Line
                    type="monotone" dataKey="price" name="Price (₹/kg)" stroke="#2E7D32" strokeWidth={2}
                    dot={false} legendType="none"
                  />
                  <Line
                    type="monotone" dataKey="price" name="Forecast (estimate)" stroke="#52B788" strokeWidth={2}
                    strokeDasharray="6 4" dot={false} connectNulls
                    data={chartData.slice(historyCount > 0 ? historyCount - 1 : 0)}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-800">
              <b>Disclaimer:</b> {data!.source_note} Forecast values are statistical estimates for demonstration and must
              not be treated as real market prices.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

