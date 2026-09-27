import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { ErrorState, StatusBadge } from "../../components/common/ui";
import type { AdminUser } from "../../types";

export default function ProfilePage() {
  const { data, loading, error, retry } = useAsyncData<AdminUser>(() => api("/api/auth/me/detail"), []);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-ink-soft mt-1">Your account details.</p>
      </div>
      {loading ? (
        <div className="card p-6 space-y-3"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-3/4" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{data!.full_name}</h2>
            <StatusBadge status={data!.status} />
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            <Row k="Email" v={data!.email} />
            <Row k="Phone" v={data!.phone} />
            <Row k="Role" v={data!.role} />
            {data!.village && <Row k="Village" v={`${data!.village}, ${data!.district ?? ""}`} />}
            {data!.business_name && <Row k="Business" v={`${data!.business_name} (${data!.business_type ?? ""})`} />}
            {data!.vehicle_summary && <Row k="Vehicle" v={data!.vehicle_summary} />}
            {data!.trust_score != null && <Row k="Trust score" v={String(data!.trust_score)} />}
          </dl>
          <p className="mt-4 text-xs text-ink-soft">Account ID: #{data!.id}</p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2.5">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="font-medium capitalize">{v}</dd>
    </div>
  );
}
