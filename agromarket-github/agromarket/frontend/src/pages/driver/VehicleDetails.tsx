import { Truck } from "lucide-react";
import { api } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { EmptyState, ErrorState } from "../../components/common/ui";

export default function VehicleDetails() {
  const { data, loading, error, retry } = useAsyncData<any[]>(() => api("/api/drivers/me/vehicles"), []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Vehicle Details</h1>
        <p className="text-sm text-ink-soft mt-1">Vehicles available for delivery jobs.</p>
      </div>
      {loading ? (
        <div className="skeleton h-32 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : data!.length === 0 ? (
        <EmptyState icon={<Truck size={28} />} title="No vehicles registered" message="Contact the admin to add your vehicle." />
      ) : (
        <div className="grid gap-4">
          {data!.map((v) => (
            <div key={v.id} className="card p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <Truck size={22} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{v.vehicle_type}</p>
                <p className="text-sm text-ink-soft">Registration: {v.registration_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ink-soft">Capacity</p>
                <p className="font-semibold text-primary-dark">{v.capacity_kg} kg</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
