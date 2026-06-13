import { Link, NavLink, Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useEraSphereOverview } from "../hooks/useEraSphereOverview";
import { SkeletonDashboard } from "../components/ui/Skeleton";

const ERASPHERE_NAV = [
  { path: "/admin/erasphere/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { path: "/admin/erasphere/partners", label: "Partners", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { path: "/admin/erasphere/clients", label: "Clients", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { path: "/admin/erasphere/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
];

function formatRevenue(amount: number): string {
  // Invoice-derived revenue is shown in USD everywhere else in the app.
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EraSphereOverviewCard() {
  const { data, loading } = useEraSphereOverview();

  if (loading || !data) {
    return (
      <div className="mt-auto hidden px-4 pb-5 lg:block">
        <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-3 w-28" />
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Partners", value: String(data.partners), href: "/admin/erasphere/partners" },
    { label: "Referred clients", value: String(data.referredClients), href: "/admin/erasphere/clients" },
    { label: "Active tasks", value: String(data.activeTasks), href: "/admin/erasphere/tasks" },
    { label: "Total revenue", value: formatRevenue(data.totalRevenue), href: "/admin/erasphere/analytics" },
  ];

  return (
    <div className="mt-auto hidden px-4 pb-5 lg:block">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Referral Program
        </p>
        <div className="mt-3 space-y-2 text-[0.8125rem]">
          {rows.map((r) => (
            <Link key={r.label} to={r.href} className="group flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-text-primary)]">
                {r.label}
              </span>
              <span className="truncate font-semibold tabular-nums text-[var(--color-text-primary)]">{r.value}</span>
            </Link>
          ))}
        </div>
        {data.pendingRevenue > 0 && (
          <Link
            to="/admin/erasphere/analytics"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--color-warning-text)] transition hover:brightness-110"
          >
            <span>Pending revenue</span>
            <span className="font-semibold tabular-nums">{formatRevenue(data.pendingRevenue)}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function EraSphereLayoutInner() {
  const { loading, error } = useAdmin();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-16">
        <div className="max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6">
          <p className="mb-2 font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="text-sm text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16">
      {/* Sidebar: icon rail on tablet (md), full at lg+ */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[68px] shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden border-r border-[var(--color-border)] bg-[var(--color-bg)] md:flex lg:w-[248px]">
        <div className="hidden px-5 pb-3 pt-6 lg:block">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            EraSphere Workspace
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 pt-4 lg:pt-0" aria-label="EraSphere">
          {ERASPHERE_NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/analytics")}
              title={label}
              className={({ isActive }) =>
                `group relative flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all lg:justify-start ${
                  isActive
                    ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-nav-active-bg)] transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden="true"
                  />
                  <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={icon} />
                  </svg>
                  <span className="hidden min-w-0 flex-1 lg:block">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <EraSphereOverviewCard />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
