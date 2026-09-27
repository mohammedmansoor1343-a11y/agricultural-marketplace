import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "../../context/AppContext";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function GlassOverlay({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="glass-overlay" role="alertdialog" aria-live="polite">
      <div className="glass-card">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-base font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-sm text-ink-soft text-center max-w-xs">{subtitle}</p>}
      </div>
   </div>
  );
}

export function GlobalToasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm shadow-pop flex items-start justify-between gap-3 animate-in ${
            t.type === "success"
              ? "bg-white border-primary-accent/40 text-ink"
              : t.type === "error"
              ? "bg-white border-red-200 text-red-700"
              : "bg-white border-line text-ink"
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-ink-soft hover:text-ink">
            <X size={15} />
          </button>
        </div>
        ))}
    </div>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>{["A", "B", "C", "D"].map((k) => <th key={k}><Skeleton className="h-3 w-16" /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {["A", "B", "C", "D"].map((k) => <td key={k}><Skeleton className="h-4 w-full" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const toneMap: Record<string, string> = {
  green: "text-primary",
  emerald: "text-emerald-600",
  blue: "text-blue-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
};

export function SummaryCards({ cards }: { cards: { label: string; value: string | number; tone?: string }[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <p className="text-sm text-ink-soft">{c.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${toneMap[c.tone ?? "green"] ?? "text-ink"}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, message }: { icon?: ReactNode; title: string; message?: string }) {
  return (
    <div className="card p-10 text-center">
      {icon && <div className="mx-auto mb-3 text-primary-accent">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 text-sm text-ink-soft max-w-sm mx-auto">{message}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-8 text-center border-red-200">
      <p className="font-semibold text-red-600">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4 mx-auto" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="glass-overlay" role="dialog" aria-modal="true">
      <div className={`card w-full ${width} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const statusTone: Record<string, string> = {
  // shared
  pending: "badge-amber",
  verified: "badge-green",
  rejected: "badge-red",
  aggregated: "badge-blue",
  partial: "badge-amber",
  cancelled: "badge-red",
  failed: "badge-red",
  refunded: "badge-gray",
  paid: "badge-green",
  processing: "badge-blue",
  completed: "badge-green",
  // lots
  collecting: "badge-amber",
  ready: "badge-green",
  ordered: "badge-blue",
  assigned: "badge-blue",
  pickup_assigned: "badge-blue",
  in_transit: "badge-blue",
  delivered: "badge-green",
  // deliveries
  accepted: "badge-blue",
  at_pickup: "badge-blue",
  pickup_confirmed: "badge-blue",
  confirmed: "badge-blue",
  driver_assigned: "badge-blue",
  picked_up: "badge-blue",
  pickup_scheduled: "badge-blue",
  suspended: "badge-red",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "badge-gray";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={tone}>{label}</span>;
}

export function rupees(n: number | string | null | undefined, compact = false): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 0 : 2,
  }).format(v || 0);
}

export function kg(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(v || 0)} kg`;
}
