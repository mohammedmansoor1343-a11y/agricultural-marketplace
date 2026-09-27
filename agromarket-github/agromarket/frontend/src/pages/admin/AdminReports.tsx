import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, Skeleton } from "../../components/common/ui";
import type { ReportData } from "../../types";

const COLORS = ["#2E7D32", "#52B788", "#1B4332", "#95D5B2", "#40916C", "#74C69C", "#B7E4C7"];

export default function AdminReports() {
  const { data, loading, error, retry } = useAsyncData<ReportData>(() => api("/api/reports"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-ink-soft mt-1">Platform activity overview (demonstration data).</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Total Produce Volume</p>
              <p className="mt-1 text-2xl font-semibold text-primary-dark">{data!.produce_volume.total_kg.toLocaleString("en-IN")} kg</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Transactions</p>
              <p className="mt-1 text-2xl font-semibold text-primary-dark">{data!.transaction_activity.total_transactions}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-ink-soft">Transaction Value</p>
              <p className="mt-1 text-2xl font-semibold text-primary-dark">
                ₹{data!.transaction_activity.total_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <h2 className="font-semibold">Crop Distribution (volume)</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data!.produce_volume.by_crop} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {data!.produce_volume.by_crop.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} kg`, "Volume"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold">Orders by Status</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.orders_by_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2E7D32" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold">Delivery Performance</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.deliveries_by_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#52B788" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold">Payment Activity</h2>
              <p className="text-xs text-ink-soft mt-0.5">{data!.transaction_activity.note}</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.payments_by_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1B4332" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
