import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Sprout, Store, Truck, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { register } from "../../api/client";
import { Spinner } from "../../components/common/ui";

type Role = "farmer" | "buyer" | "driver" | "coordinator";

const roleCards: { role: Role; label: string; desc: string; icon: React.ReactElement }[] = [
  { role: "farmer", label: "Farmer", desc: "List produce and join bulk lots", icon: <Sprout size={20} /> },
  { role: "buyer", label: "Buyer", desc: "Source verified produce in bulk", icon: <Store size={20} /> },
  { role: "driver", label: "Driver", desc: "Deliver produce with your vehicle", icon: <Truck size={20} /> },
  { role: "coordinator", label: "Village Coordinator", desc: "Help farmers verify produce", icon: <Users size={20} /> },
];

const inputCls = "input";

export default function RegisterPage() {
  const { setAuth, overlay } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const fields: Record<Role, { key: string; label: string; type?: string; placeholder?: string; required?: boolean }[]> = {
    farmer: [
      { key: "full_name", label: "Full Name" },
      { key: "phone", label: "Phone Number", placeholder: "10-digit mobile" },
      { key: "email", label: "Email", type: "email" },
      { key: "village", label: "Village" },
      { key: "district", label: "District" },
      { key: "password", label: "Password", type: "password", placeholder: "Minimum 6 characters" },
    ],
    buyer: [
      { key: "full_name", label: "Full Name" },
      { key: "business_name", label: "Business Name" },
      { key: "business_type", label: "Business Type", placeholder: "Retailer / Hotel / Wholesaler" },
      { key: "phone", label: "Phone Number" },
      { key: "email", label: "Email", type: "email" },
      { key: "business_address", label: "Business Address" },
      { key: "gst_number", label: "GST Number / Shop License (optional)" },
      { key: "password", label: "Password", type: "password" },
    ],
    driver: [
      { key: "full_name", label: "Full Name" },
      { key: "phone", label: "Phone Number" },
      { key: "email", label: "Email", type: "email" },
      { key: "driving_license_number", label: "Driving License Number" },
      { key: "vehicle_type", label: "Vehicle Type", placeholder: "Mini Truck / Tempo / Bol Pickup" },
      { key: "vehicle_registration_number", label: "Vehicle Registration Number" },
      { key: "vehicle_capacity_kg", label: "Vehicle Capacity (kg)", type: "number" },
      { key: "service_area", label: "Service Area", placeholder: "Villages or district you serve" },
      { key: "password", label: "Password", type: "password" },
    ],
    coordinator: [
      { key: "full_name", label: "Full Name" },
      { key: "phone", label: "Phone Number" },
      { key: "email", label: "Email", type: "email" },
      { key: "village", label: "Village" },
      { key: "district", label: "District" },
      { key: "password", label: "Password", type: "password" },
    ],
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError(null);

    const missing = fields[role].filter((f) => f.required !== false && !String(form[f.key] ?? "").trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    const payload: Record<string, unknown> = { role, ...form };
    if (role === "driver") payload.vehicle_capacity_kg = parseFloat(form.vehicle_capacity_kg);

    setBusy(true);
    overlay.show("Creating your account...", "Setting up your workspace");
    try {
      const res = await register(payload);
      setAuth(res.access_token, res.user);
      navigate(`/${res.user.role}`);
    } catch (err: any) {
      setError(err.message ?? "Unable to create account. Please try again.");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-primary-dark text-lg mb-6">
          <Leaf size={24} className="text-primary" /> AgroMarket
        </Link>

        <div className="card p-7">
          {!role ? (
            <>
              <h1 className="text-xl font-bold text-center">Join AgroMarket</h1>
              <p className="text-sm text-ink-soft text-center mt-1">Select your role to continue.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {roleCards.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => setRole(r.role)}
                    className="card p-5 text-left hover:border-primary-accent hover:shadow-pop transition-all flex items-start gap-3"
                  >
                    <span className="h-10 w-10 rounded-lg bg-primary-accent/15 text-primary flex items-center justify-center shrink-0">{r.icon}</span>
                    <span>
                      <span className="block font-semibold">{r.label}</span>
                      <span className="block text-sm text-ink-soft mt-0.5">{r.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-ink-soft">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setRole(null)} className="text-sm text-primary hover:underline mb-4">
                ← Change role
              </button>
              <h1 className="text-xl font-bold">Register as {roleCards.find((r) => r.role === role)?.label}</h1>
              <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
                {fields[role].map((f) => (
                  <div key={f.key} className={f.key === "business_address" ? "sm:col-span-2" : ""}>
                    <label className="label" htmlFor={f.key}>{f.label}</label>
                    <input
                      id={f.key}
                      type={f.type ?? "text"}
                      className={inputCls}
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ""}
                      onChange={set(f.key)}
                    />
                  </div>
                ))}
                {error && <p className="field-error sm:col-span-2" role="alert">{error}</p>}
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary w-full" disabled={busy}>
                    {busy && <Spinner className="h-4 w-4" />} Create Account
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
