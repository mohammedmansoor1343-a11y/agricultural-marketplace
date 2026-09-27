import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function ForgotPasswordPage() {
  const { toast } = useApp();
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast("If this account exists, a reset link has been sent (simulated in demo).", "info");
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-primary-dark text-lg mb-6">
          <Leaf size={24} className="text-primary" /> AgroMarket
        </Link>
        <div className="card p-7">
          <h1 className="text-xl font-bold">Reset your password</h1>
          {sent ? (
            <p className="mt-3 text-sm text-ink-soft">
              Request received. In production this would send an SMS/email reset link. For this prototype, contact the
              platform admin to reset your password.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-soft mt-1">Enter your registered email or phone number.</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="ident">Email or phone</label>
                  <input id="ident" className="input" placeholder="you@example.com" required />
                </div>
                <button className="btn-primary w-full">Send reset link</button>
              </form>
            </>
          )}
          <p className="mt-5 text-sm text-center">
            <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
