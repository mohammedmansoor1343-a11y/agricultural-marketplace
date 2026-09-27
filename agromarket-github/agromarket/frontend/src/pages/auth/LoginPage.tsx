import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { login } from "../../api/client";
import { Spinner } from "../../components/common/ui";

const demoAccounts = [
  { label: "Farmer", email: "ramesh@agromarket.in" },
  { label: "Buyer", email: "vikram@agromarket.in" },
  { label: "Driver", email: "imran@agromarket.in" },
  { label: "Coordinator", email: "coordinator@agromarket.in" },
  { label: "Admin", email: "admin@agromarket.in" },
];

export default function LoginPage() {
  const { setAuth, overlay } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Please enter your email/phone and password.");
      return;
    }
    setBusy(true);
    overlay.show("Signing you in...", "Verifying your credentials");
    try {
      const res = await login(identifier.trim(), password);
      setAuth(res.access_token, res.user);
      navigate(`/${res.user.role}`);
    } catch (err: any) {
      setError(err.message ?? "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
      overlay.hide();
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-primary-dark text-lg mb-6">
          <Leaf size={24} className="text-primary" /> AgroMarket
        </Link>
        <div className="card p-7">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-ink-soft mt-1">Log in to your marketplace account.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="identifier">Phone number or email</label>
              <input
                id="identifier"
                className="input"
                placeholder="you@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} Login
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline">Forgot Password?</Link>
            <Link to="/register" className="text-primary hover:underline">Create Account</Link>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Demo accounts — password: Demo@123</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  className="btn-secondary !py-2 text-xs"
                  onClick={() => {
                    setIdentifier(d.email);
                    setPassword("Demo@123");
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
