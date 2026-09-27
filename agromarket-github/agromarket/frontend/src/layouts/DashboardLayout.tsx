import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Leaf, LogOut, Menu, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { GlassOverlay } from "../components/common/ui";
import type { Role } from "../types";

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  farmer: [
    { to: "/farmer", label: "Dashboard", end: true },
    { to: "/farmer/produce", label: "My Produce" },
    { to: "/farmer/produce/add", label: "Add Produce" },
    { to: "/farmer/lots", label: "Bulk Lots" },
    { to: "/farmer/marketplace", label: "Marketplace" },
    { to: "/farmer/orders", label: "Orders" },
    { to: "/farmer/payments", label: "Payments" },
    { to: "/farmer/trends", label: "Price Trends" },
    { to: "/farmer/trust", label: "Trust Score" },
    { to: "/farmer/profile", label: "Profile" },
  ],
  buyer: [
    { to: "/buyer", label: "Dashboard", end: true },
    { to: "/buyer/marketplace", label: "Marketplace" },
    { to: "/buyer/lots", label: "Bulk Lots" },
    { to: "/buyer/orders", label: "My Orders" },
    { to: "/buyer/deliveries", label: "Deliveries" },
    { to: "/buyer/payments", label: "Payments" },
    { to: "/buyer/profile", label: "Profile" },
  ],
  driver: [
    { to: "/driver", label: "Dashboard", end: true },
    { to: "/driver/jobs", label: "Available Deliveries" },
    { to: "/driver/deliveries", label: "My Deliveries" },
    { to: "/driver/vehicle", label: "Vehicle Details" },
    { to: "/driver/earnings", label: "Earnings" },
    { to: "/driver/history", label: "Delivery History" },
    { to: "/driver/profile", label: "Profile" },
  ],
  coordinator: [
    { to: "/coordinator", label: "Dashboard", end: true },
    { to: "/coordinator/register-farmer", label: "Register Farmer" },
    { to: "/coordinator/farmers", label: "Farmer Directory" },
    { to: "/coordinator/add-produce", label: "Add Produce Listing" },
    { to: "/coordinator/verify", label: "Verify Produce" },
    { to: "/coordinator/verification-history", label: "Verification History" },
    { to: "/coordinator/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/users", label: "User Management" },
    { to: "/admin/listings", label: "Produce Listings" },
    { to: "/admin/lots", label: "Bulk Lots" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/deliveries", label: "Deliveries" },
    { to: "/admin/payments", label: "Payments" },
    { to: "/admin/trust", label: "Trust Scores" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/settings", label: "Settings" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  driver: "Driver",
  coordinator: "Village Coordinator",
  admin: "Administrator",
};

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, booting, logout, overlay } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!booting && !user) navigate("/login", { replace: true });
  }, [booting, user, navigate]);

  if (booting) {
    return <GlassOverlay title="Loading your workspace..." subtitle="Checking your session" />;
  }
  if (!user) return null;

  const items = NAV[user.role] ?? [];

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-primary-dark text-white transform transition-transform duration-200
                    lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <Leaf size={22} className="text-primary-accent" />
          <span className="font-semibold tracking-tight">AgroMarket</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="text-xs text-white/60">{ROLE_LABEL[user.role]}</p>
        </div>
        <nav className="px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-8.5rem)]">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} /> Logout
          </button>
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white/90 border-b border-line flex items-center gap-3 px-4 sm:px-6
                          backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <button className="lg:hidden text-ink" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="lg:hidden font-semibold flex items-center gap-1.5">
            <Leaf size={18} className="text-primary" /> AgroMarket
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-ink-soft">{user.email}</span>
            <span className="badge-green">{ROLE_LABEL[user.role]}</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="px-6 py-4 text-xs text-ink-soft border-t border-line">
          AgroMarket prototype — demonstration data only. Payments are simulated; price forecasts are estimates.
        </footer>
      </div>

      {overlay.visible && <GlassOverlay title={overlay.title} subtitle={overlay.subtitle} />}
    </div>
  );
}
