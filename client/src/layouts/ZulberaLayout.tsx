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
  MessageSquare,
  Users,
} from "lucide-react";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useWorkspaceOverview } from "../hooks/useWorkspaceOverview";
import { useNotifications } from "../hooks/useNotifications";
import { SkeletonDashboard } from "../components/ui/Skeleton";

const ZULBERA_NAV = [
  { path: "/admin/zulbera/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/zulbera/workers", label: "Workers", icon: Users },
  { path: "/admin/zulbera/clients", label: "Clients", icon: Briefcase },
  { path: "/admin/zulbera/tasks", label: "Tasks", icon: Check },
  { path: "/admin/zulbera/comments", label: "Comments", icon: MessageSquare, showNotificationBadge: true },
  { path: "/admin/zulbera/invoices", label: "Invoices", icon: FileText },
  { path: "/admin/zulbera/domains", label: "Domains", icon: Globe },
  { path: "/admin/zulbera/send-offer", label: "Send Offer", icon: Mail },
  { path: "/admin/zulbera/timesheets", label: "Timesheets", icon: Clock },
];

function WorkspaceOverviewCard() {
  const { data, loading } = useWorkspaceOverview();

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

  const expiringTotal =
    data.domainsExpiringInOneWeek + data.domainsExpiringInTwoWeeks + data.domainsExpiringIn30Days;

  const rows = [
    { label: "Workers", value: data.workers, href: "/admin/zulbera/workers" },
    { label: "Clients", value: data.clients, href: "/admin/zulbera/clients" },
    { label: "Active tasks", value: data.activeTasks, href: "/admin/zulbera/tasks" },
    { label: "Unpaid invoices", value: data.unpaidInvoices, href: "/admin/zulbera/invoices", warn: data.unpaidInvoices > 0 },
  ];

  return (
    <div className="mt-auto hidden px-4 pb-5 lg:block">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Workspace
        </p>
        <div className="mt-3 space-y-2 text-[0.8125rem]">
          {rows.map((r) => (
            <Link key={r.label} to={r.href} className="group flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-text-primary)]">
                {r.label}
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  r.warn ? "text-[var(--color-warning-text)]" : "text-[var(--color-text-primary)]"
                }`}
              >
                {r.value}
              </span>
            </Link>
          ))}
        </div>
        {expiringTotal > 0 && (
          <Link
            to="/admin/zulbera/domains"
            className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--color-warning-text)] transition hover:brightness-110"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {expiringTotal} domain{expiringTotal !== 1 ? "s" : ""} expiring soon
          </Link>
        )}
        {data.workersWithIncompleteTasks > 0 && (
          <Link
            to="/admin/zulbera/workers"
            className="mt-2 block truncate text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
          >
            {data.workersWithIncompleteTasks} worker{data.workersWithIncompleteTasks !== 1 ? "s" : ""} with open tasks
          </Link>
        )}
      </div>
    </div>
  );
}

function ZulberaLayoutInner() {
  const { loading, error } = useAdmin();
  const { unreadCount } = useNotifications();

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
            Zulbera Workspace
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 pt-4 lg:pt-0" aria-label="Zulbera">
          {ZULBERA_NAV.map(({ path, label, icon: Icon, showNotificationBadge }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/analytics")}
              title={label}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all justify-center lg:justify-start ${
                  isActive
                    ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active accent bar */}
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-nav-active-bg)] transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative shrink-0">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {showNotificationBadge && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white lg:hidden">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden min-w-0 flex-1 lg:block">{label}</span>
                  {showNotificationBadge && unreadCount > 0 && (
                    <span className="hidden h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white lg:flex">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <WorkspaceOverviewCard />
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

export default function ZulberaLayout() {
  return (
    <AdminProvider>
      <ZulberaLayoutInner />
    </AdminProvider>
  );
}
