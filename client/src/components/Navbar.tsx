import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LayoutDashboard, UsersRound, Building2, SquareKanban, MessageSquare, Receipt, Globe, Send, CalendarClock, Handshake, Image as ImageIcon } from "lucide-react";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { ThemeToggle } from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
import { useNotifications } from "../hooks/useNotifications";
import MobileNavSheet from "./MobileNavSheet";
import type { SheetSection } from "./MobileNavSheet";

const ERASPHERE_TABS = [
  { path: "erasphere-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "clients", label: "Clients", icon: Building2 },
  { path: "tasks", label: "Tasks", icon: SquareKanban },
];

const ADMIN_ERASPHERE_TABS = [
  { path: "analytics", label: "Analytics", icon: LayoutDashboard },
  { path: "partners", label: "Partners", icon: Handshake },
  { path: "clients", label: "Clients", icon: Building2 },
  { path: "tasks", label: "Tasks", icon: SquareKanban },
];

const ZULBERA_NAV_LINKS = [
  { path: "analytics", label: "Analytics", icon: LayoutDashboard },
  { path: "workers", label: "Workers", icon: UsersRound },
  { path: "clients", label: "Clients", icon: Building2 },
  { path: "tasks", label: "Tasks", icon: SquareKanban },
  { path: "comments", label: "Comments", icon: MessageSquare },
  { path: "invoices", label: "Invoices", icon: Receipt },
  { path: "domains", label: "Domains", icon: Globe },
  { path: "send-offer", label: "Send Offer", icon: Send },
  { path: "timesheets", label: "Timesheets", icon: CalendarClock },
];

const CLIENT_TABS = ["overview", "tasks", "invoices", "files", "domains"] as const;
const CLIENT_TAB_META: Record<string, { label: string; icon: typeof LayoutDashboard }> = {
  overview: { label: "Overview", icon: LayoutDashboard },
  tasks: { label: "Tasks", icon: SquareKanban },
  invoices: { label: "Invoices", icon: Receipt },
  files: { label: "Files", icon: ImageIcon },
  domains: { label: "Domains", icon: Globe },
};

function initials(fullName: string | null): string {
  if (!fullName) return "?";
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export default function Navbar() {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const isAdmin = role === "ADMIN";
  const isEraSphere = role === "ERASPHERE";
  const isWorker = role === "WORKER";
  const isClient = role === "CLIENT";
  const location = useLocation();
  const navigate = useNavigate();
  const isAnalytics = location.pathname === "/";
  const isOnZulberaSection =
    isAdmin && (location.pathname === "/admin/zulbera" || location.pathname.startsWith("/admin/zulbera/"));
  const isOnEraSphereSection =
    isAdmin && (location.pathname === "/admin/erasphere" || location.pathname.startsWith("/admin/erasphere/"));
  const isDashboard = location.pathname === "/dashboard";
  const [searchParams] = useSearchParams();
  const workerTab = searchParams.get("tab") || "overview";
  const clientTab = searchParams.get("tab") || "overview";
  const { mobileMenuOpen, setMobileMenuOpen } = useMobileMenu();
  const { unreadCount } = useNotifications();

  const mobileSections: SheetSection[] = isAdmin
    ? [
        { label: "Main", items: [{ path: "/", label: "Analytics", icon: LayoutDashboard, end: true }] },
        { label: "Zulbera", items: ZULBERA_NAV_LINKS.map((l) => ({ path: `/admin/zulbera/${l.path}`, label: l.label, icon: l.icon, badge: l.path === "comments" ? unreadCount : undefined })) },
        { label: "EraSphere", items: ADMIN_ERASPHERE_TABS.map((l) => ({ path: `/admin/erasphere/${l.path}`, label: l.label, icon: l.icon })) },
      ]
    : isEraSphere
    ? [{ label: "Navigation", items: ERASPHERE_TABS.map((l) => ({ path: `/admin/${l.path}`, label: l.label, icon: l.icon })) }]
    : isWorker
    ? [{ label: "Dashboard", items: [
        { path: "/dashboard?tab=overview", label: "Overview", icon: LayoutDashboard },
        { path: "/dashboard?tab=tasks", label: "Tasks", icon: SquareKanban },
      ] }]
    : isClient
    ? [{ label: "Dashboard", items: CLIENT_TABS.map((t) => ({ path: `/dashboard?tab=${t}`, label: CLIENT_TAB_META[t].label, icon: CLIENT_TAB_META[t].icon })) }]
    : [];

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Close menus on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Click-outside for the user menu
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  /* Segmented primary nav (desktop) */
  const segItem = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
      active
        ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] shadow-elev-sm"
        : "text-[var(--color-nav-link-text)] hover:text-[var(--color-nav-link-hover-text)]"
    }`;

  const primaryNav: { to: string; label: string; active: boolean }[] = isWorker
    ? [
        { to: "/dashboard?tab=overview", label: "Overview", active: isDashboard && workerTab === "overview" },
        { to: "/dashboard?tab=tasks", label: "Tasks", active: isDashboard && workerTab === "tasks" },
      ]
    : isEraSphere
    ? ERASPHERE_TABS.map(({ path, label }) => ({
        to: `/admin/${path}`,
        label,
        active:
          location.pathname === `/admin/${path}` ||
          (path === "erasphere-dashboard" && location.pathname === "/admin"),
      }))
    : isClient
    ? CLIENT_TABS.map((tab) => ({
        to: `/dashboard?tab=${tab}`,
        label: tab.charAt(0).toUpperCase() + tab.slice(1),
        active: isDashboard && clientTab === tab,
      }))
    : [];

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: logo */}
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Zulbera home"
          >
            <img
              src="/Zulbera-Text-Logo.svg"
              alt="Zulbera"
              className="h-7 w-auto max-w-[140px] object-contain transition-transform duration-200 group-hover:scale-[1.04]"
            />
          </Link>

          {/* Center: primary nav (desktop) */}
          {token && isAdmin ? (
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              {/* Analytics — global cross-workspace overview, kept separate from the workspace toggle */}
              <Link
                to="/"
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                  isAnalytics
                    ? "border-transparent bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] shadow-elev-sm"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-nav-link-text)] hover:text-[var(--color-nav-link-hover-text)]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                Analytics
              </Link>

              {/* Workspace toggle: Zulbera ⇄ EraSphere (single source — also drives the sidebar) */}
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                <Link to="/admin/zulbera" className={segItem(isOnZulberaSection)}>
                  Zulbera
                </Link>
                <Link
                  to="/admin/erasphere"
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                    isOnEraSphereSection
                      ? "bg-gradient-to-br from-[#e7b7a6] via-[#c98a82] to-[#b76e79] text-white shadow-[0_4px_14px_rgba(183,110,121,0.4)]"
                      : "text-[var(--color-nav-link-text)] hover:text-[var(--color-nav-link-hover-text)]"
                  }`}
                >
                  EraSphere
                </Link>
              </div>
            </div>
          ) : token && primaryNav.length > 0 ? (
            <div className="hidden min-w-0 items-center md:flex">
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                {primaryNav.map(({ to, label, active }) => (
                  <Link key={to} to={to} className={segItem(active)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {token && (
              <>
                <NotificationDropdown />
                <ThemeToggle />
                {/* User menu (desktop) */}
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1 pl-1.5 pr-3 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    aria-label="Account menu"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-nav-active-bg)] text-xs font-bold text-[var(--color-nav-active-text)]">
                      {initials(name)}
                    </span>
                    <span className="max-w-[120px] truncate text-sm font-medium text-[var(--color-text-secondary)]">
                      {name}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-solid)] shadow-elev-lg animate-scale-in"
                      role="menu"
                    >
                      <div className="border-b border-[var(--color-border)] px-4 py-3">
                        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
                        <p className="mt-0.5 text-xs capitalize text-[var(--color-text-muted)]">
                          {role?.toLowerCase()}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/settings/notifications");
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 01-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Notification settings
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={logout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-destructive-text)] transition hover:bg-[var(--color-destructive-bg)]"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!token && (
              <Link
                to="/login"
                className="hidden items-center gap-2 rounded-full border border-[var(--color-border-hover)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-btn-ghost-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] md:flex"
              >
                Log In
              </Link>
            )}

            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile navigation — premium bottom sheet */}
      {token && (
        <MobileNavSheet
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title={name || "Menu"}
          subtitle={role ? role.charAt(0) + role.slice(1).toLowerCase() : undefined}
          sections={mobileSections}
          alertCount={unreadCount}
        />
      )}

    </>
  );
}
