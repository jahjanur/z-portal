import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Send,
  SquareKanban,
  UsersRound,
} from "lucide-react";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useWorkspaceOverview } from "../hooks/useWorkspaceOverview";
import { useNotifications } from "../hooks/useNotifications";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import MobileTabBar from "../components/MobileTabBar";
import MobileNavSheet from "../components/MobileNavSheet";

const ZULBERA_TABS = [
  { to: "/admin/zulbera/analytics", label: "Analytics", icon: LayoutDashboard, end: true },
  { to: "/admin/zulbera/tasks", label: "Tasks", icon: SquareKanban },
  { to: "/admin/zulbera/clients", label: "Clients", icon: Building2 },
  { to: "/admin/zulbera/invoices", label: "Invoices", icon: Receipt },
];

const ZULBERA_NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { path: "/admin/zulbera/analytics", label: "Analytics", icon: LayoutDashboard },
      { path: "/admin/zulbera/timesheets", label: "Timesheets", icon: CalendarClock },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/admin/zulbera/workers", label: "Workers", icon: UsersRound },
      { path: "/admin/zulbera/clients", label: "Clients", icon: Building2 },
      { path: "/admin/zulbera/tasks", label: "Tasks", icon: SquareKanban },
      { path: "/admin/zulbera/comments", label: "Comments", icon: MessageSquare, showNotificationBadge: true },
    ],
  },
  {
    label: "Finance",
    items: [
      { path: "/admin/zulbera/invoices", label: "Invoices", icon: Receipt },
      { path: "/admin/zulbera/domains", label: "Domains", icon: Globe },
      { path: "/admin/zulbera/send-offer", label: "Send Offer", icon: Send },
    ],
  },
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
  useMobileMenu();
  const [navSheetOpen, setNavSheetOpen] = useState(false);

  const sheetSections = ZULBERA_NAV_SECTIONS.map((s) => ({
    label: s.label,
    items: s.items.map((it) => ({
      path: it.path,
      label: it.label,
      icon: it.icon,
      badge: (it as { showNotificationBadge?: boolean }).showNotificationBadge && unreadCount > 0 ? unreadCount : undefined,
    })),
  }));

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
      <aside className="app-sidebar sticky top-16 hidden h-[calc(100vh-4rem)] w-[72px] shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden md:flex lg:w-[252px]">
        <nav className="flex-1 space-y-4 px-3 pt-6" aria-label="Zulbera">
          {ZULBERA_NAV_SECTIONS.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="nav-section-label mb-1 hidden lg:block">{section.label}</p>
              {section.items.map(({ path, label, icon: Icon, showNotificationBadge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path.endsWith("/analytics")}
                  title={label}
                  className={({ isActive }) =>
                    `nav-item justify-center lg:justify-start ${isActive ? "active" : ""}`
                  }
                >
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
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <WorkspaceOverviewCard />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 [overflow-x:clip]">
        <div className="mx-auto max-w-[1400px] px-4 py-6 pb-28 sm:px-6 md:pb-8 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      <MobileTabBar items={ZULBERA_TABS} onMore={() => setNavSheetOpen(true)} moreActive={navSheetOpen} />
      <MobileNavSheet open={navSheetOpen} onClose={() => setNavSheetOpen(false)} title="Zulbera" subtitle="Workspace" sections={sheetSections} alertCount={unreadCount} />
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
