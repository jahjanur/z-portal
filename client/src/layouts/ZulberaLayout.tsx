import { Link, NavLink, Outlet } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Check,
  Clock,
  FileText,
  Globe,
  Mail,
  Users,
} from "lucide-react";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useWorkspaceOverview } from "../hooks/useWorkspaceOverview";

const ZULBERA_NAV = [
  { path: "/admin/zulbera/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/zulbera/workers", label: "Workers", icon: Users },
  { path: "/admin/zulbera/clients", label: "Clients", icon: Briefcase },
  { path: "/admin/zulbera/tasks", label: "Tasks", icon: Check },
  { path: "/admin/zulbera/invoices", label: "Invoices", icon: FileText },
  { path: "/admin/zulbera/domains", label: "Domains", icon: Globe },
  { path: "/admin/zulbera/send-offer", label: "Send Offer", icon: Mail },
  { path: "/admin/zulbera/timesheets", label: "Timesheets", icon: Clock },
];

function WorkspaceOverviewCard() {
  const { data, loading } = useWorkspaceOverview();

  if (loading || !data) {
    return (
      <div className="px-5 pb-6 mt-auto">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Your workspace</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-70">Loading…</p>
        </div>
      </div>
    );
  }

  const alerts: { text: string; href: string }[] = [];
  if (data.workersWithIncompleteTasks > 0) {
    alerts.push({ text: `${data.workersWithIncompleteTasks} worker(s) with tasks not done`, href: "/admin/zulbera/workers" });
  }
  if (data.unpaidInvoices > 0) {
    alerts.push({ text: `${data.unpaidInvoices} unpaid invoice(s)`, href: "/admin/zulbera/invoices" });
  }
  if (data.domainsExpiringSoon > 0) {
    alerts.push({ text: `${data.domainsExpiringSoon} domain(s) expiring soon`, href: "/admin/zulbera/domains" });
  }

  return (
    <div className="px-5 pb-6 mt-auto">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 space-y-3">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">Workspace Overview</p>
        <div className="space-y-1.5 text-xs">
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>👥 Workers</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.workers}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>🏢 Clients</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.clients}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>📋 Active tasks</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.activeTasks}</span>
          </p>
          <p className="flex justify-between text-[var(--color-text-secondary)]">
            <span>💰 Unpaid invoices</span>
            <span className="font-medium text-[var(--color-text-primary)]">{data.unpaidInvoices}</span>
          </p>
        </div>
        {data.domainsExpiringSoon > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {data.domainsExpiringSoon} domain{data.domainsExpiringSoon !== 1 ? "s" : ""} expiring soon
          </p>
        )}
        {alerts.length > 0 && (
          <div className="pt-1 border-t border-[var(--color-border)] space-y-1">
            {alerts.slice(0, 3).map((a, i) => (
              <Link
                key={i}
                to={a.href}
                className="block text-xs text-[var(--color-primary)] hover:underline truncate"
              >
                {a.text}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
          {ZULBERA_NAV.map(({ path, label, icon: Icon }) => (
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
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <WorkspaceOverviewCard />
      </aside>

      {/* Mobile nav for Zulbera (below lg breakpoint) */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          {ZULBERA_NAV.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/analytics")}
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
