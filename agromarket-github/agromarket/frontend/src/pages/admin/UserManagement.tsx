import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState, StatusBadge, TableSkeleton } from "../../components/common/ui";
import type { AdminUser } from "../../types";

const ROLES = ["all", "farmer", "buyer", "driver", "coordinator", "admin"];

export default function UserManagement() {
  const { toast } = useApp();
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const { data, loading, error, retry } = useAsyncData<AdminUser[]>(
    () => api(`/api/users?role=${role === "all" ? "" : role}&search=${encodeURIComponent(search)}`),
    [role, search]
  );

  const act = async (u: AdminUser, action: "verify" | "suspend" | "activate") => {
    try {
      await api(`/api/users/${u.id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      toast(`${u.full_name}: ${action === "suspend" ? "account suspended" : "account " + action + "d"} successfully.`);
      retry();
    } catch (err: any) {
      toast(err.message ?? "Action failed.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-ink-soft mt-1">Review, verify and manage platform accounts.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[200px]" placeholder="Search name, email or phone..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-44" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
          {ROLES.map((r) => <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>)}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState title="No users found" message="Adjust the search or role filter." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Contact</th><th>Details</th><th>Trust</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data!.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.full_name}</td>
                  <td className="capitalize">{u.role}</td>
                  <td className="text-xs">{u.email}<br />{u.phone}</td>
                  <td className="text-xs text-ink-soft max-w-[180px]">
                    {u.business_name ?? (u.village ? `${u.village}, ${u.district ?? ""}` : "—")}
                    {u.vehicle_summary && <><br />{u.vehicle_summary}</>}
                  </td>
                  <td>{u.trust_score ?? "—"}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    <div className="flex gap-1.5">
                      {u.status !== "verified" && (
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => act(u, "verify")}>Verify</button>
                      )}
                      {u.is_active && u.role !== "admin" && (
                        <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => act(u, "suspend")}>Suspend</button>
                      )}
                      {!u.is_active && (
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => act(u, "activate")}>Activate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
