import { NavLink, Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";

const ZULBERA_NAV = [
  { path: "/admin/zulbera/workers", label: "Workers", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { path: "/admin/zulbera/clients", label: "Clients", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { path: "/admin/zulbera/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { path: "/admin/zulbera/invoices", label: "Invoices", icon: "M9 14l6-6m-5.5 0h10.5" },
  { path: "/admin/zulbera/domains", label: "Domains", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 019-9" },
  { path: "/admin/zulbera/send-offer", label: "Send Offer", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { path: "/admin/zulbera/timesheets", label: "Timesheets", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function ZulberaLayoutInner() {
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
          <span className="text-[var(--color-text-muted)]">Loading Zulbera...</span>
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
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Zulbera</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {ZULBERA_NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/workers")}
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
        <div className="px-5 pb-6 mt-auto">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Your workspace</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-70">Workers, clients, tasks, invoices, and domains you manage.</p>
          </div>
        </div>
      </aside>

      {/* Mobile nav for Zulbera (below lg breakpoint) */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          {ZULBERA_NAV.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/workers")}
              className={({ isActive }) =>
                `shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "border-[var(--color-border-hover)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:pt-6 pt-14">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function ZulberaLayout() {
  return (
    <AdminProvider>
      <ZulberaLayoutInner />
    </AdminProvider>
  );
}
