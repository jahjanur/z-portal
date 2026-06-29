import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Handshake, Building2, SquareKanban } from "lucide-react";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { useEraSphereOverview } from "../hooks/useEraSphereOverview";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import MobileTabBar from "../components/MobileTabBar";
import MobileNavSheet from "../components/MobileNavSheet";
import Footer from "../components/Footer";

const ERASPHERE_TABS = [
  { to: "/admin/erasphere/analytics", label: "Analytics", icon: LayoutDashboard, end: true },
  { to: "/admin/erasphere/partners", label: "Partners", icon: Handshake },
  { to: "/admin/erasphere/clients", label: "Clients", icon: Building2 },
  { to: "/admin/erasphere/tasks", label: "Tasks", icon: SquareKanban },
];

const ERASPHERE_NAV = [
  { path: "/admin/erasphere/analytics", label: "Analytics", icon: LayoutDashboard },
  { path: "/admin/erasphere/partners", label: "Partners", icon: Handshake },
  { path: "/admin/erasphere/clients", label: "Clients", icon: Building2 },
  { path: "/admin/erasphere/tasks", label: "Tasks", icon: SquareKanban },
];

function formatRevenue(amount: number): string {
  // Invoice-derived revenue is shown in USD everywhere else in the app.
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EraSphereOverviewCard() {
  const { data, loading } = useEraSphereOverview();

  if (loading || !data) {
    return (
      <div className="hidden px-4 pb-5 pt-3 lg:block">
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
    <div className="hidden px-4 pb-5 pt-3 lg:block">
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
  useMobileMenu();
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const sheetSections = [{ label: "Navigation", items: ERASPHERE_TABS.map((t) => ({ path: t.to, label: t.label, icon: t.icon, end: t.end })) }];

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
    <div data-workspace="erasphere" className="flex grow min-h-[calc(100vh-4rem)] pt-16">
      {/* Sidebar: icon rail on tablet (md), full at lg+.
          <aside> stretches to the full layout height (background + right border
          reach the footer — no dead gap); inner wrapper is sticky so the nav
          stays pinned while scrolling. */}
      <aside className="app-sidebar hidden w-[72px] shrink-0 self-stretch min-h-[calc(100vh-4rem)] md:block lg:w-[252px]">
        <div className="sticky top-16 flex max-h-[calc(100vh-4rem)] flex-col overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1 px-3 pt-6" aria-label="EraSphere">
          <p className="nav-section-label mb-1 hidden lg:block">Navigation</p>
          {ERASPHERE_NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path.endsWith("/analytics")}
              title={label}
              className={({ isActive }) => `nav-item justify-center lg:justify-start ${isActive ? "active" : ""}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className="hidden min-w-0 flex-1 lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>
        <EraSphereOverviewCard />
        </div>
      </aside>

      {/* Main content — flex column so the footer sits at the bottom of the
          content area (beside the full-height sidebar), not as a full-width
          band below it. */}
      <main className="flex min-w-0 flex-1 flex-col [overflow-x:clip]">
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-8 lg:px-8 lg:py-8">
          <Outlet />
        </div>
        <Footer />
      </main>

      <MobileTabBar items={ERASPHERE_TABS} onMore={() => setNavSheetOpen(true)} moreActive={navSheetOpen} />
      <MobileNavSheet open={navSheetOpen} onClose={() => setNavSheetOpen(false)} title="EraSphere" subtitle="Referral program" sections={sheetSections} />
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
