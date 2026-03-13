import { Link, NavLink, Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useEraSphereOverview } from "../hooks/useEraSphereOverview";

const ERASPHERE_NAV = [
  { path: "/admin/erasphere/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { path: "/admin/erasphere/partners", label: "Partners", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { path: "/admin/erasphere/clients", label: "Clients", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { path: "/admin/erasphere/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
];

function formatEuro(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function EraSphereOverviewCard() {
  const { data, loading } = useEraSphereOverview();

  if (loading || !data) {
    return (
      <div className="px-5 pb-6 mt-auto">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Partner referral program</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-70">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6 mt-auto">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 space-y-3">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">Partner referral program</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Manage partners, track referred clients, and monitor revenue.</p>
        <div className="space-y-1.5 text-xs">
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Partners</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.partners}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Referred clients</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.referredClients}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Active tasks</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.activeTasks}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Total revenue</span>
            <span className="font-medium text-[var(--color-text-primary)]">{formatEuro(data.totalRevenue)}</span>
          </p>
          {data.pendingRevenue > 0 && (
            <Link
              to="/admin/erasphere/analytics"
              className="flex justify-between text-[var(--color-primary)] hover:underline"
            >
              <span>Pending revenue</span>
              <span className="font-medium">{formatEuro(data.pendingRevenue)}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EraSphereLayoutInner() {
  const { loading, error } = useAdmin();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-80" />
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.1s" }} />
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-40" style={{ animationDelay: "0.2s" }} />
          </div>
          <span className="text-[var(--color-text-muted)]">Loading EraSphere...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6">
          <p className="mb-2 font-semibold text-[var(--color-destructive-text)]">Error</p>
          <p className="text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="px-5 pt-6 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">EraSphere</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {ERASPHERE_NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/analytics")}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border-hover)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] border border-transparent"
                }`
              }
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
              {label}
            </NavLink>
          ))}
        </nav>
        <EraSphereOverviewCard />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function EraSphereLayout() {
  return (
    <AdminProvider>
      <EraSphereLayoutInner />
    </AdminProvider>
  );
}
