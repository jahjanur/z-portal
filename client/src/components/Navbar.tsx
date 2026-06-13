import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { ThemeToggle } from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
import { useNotifications } from "../hooks/useNotifications";

const ERASPHERE_TABS = [
  { path: "erasphere-dashboard", label: "Dashboard" },
  { path: "clients", label: "Clients" },
  { path: "tasks", label: "Tasks" },
];

const ADMIN_ERASPHERE_TABS = [
  { path: "analytics", label: "Analytics" },
  { path: "partners", label: "Partners" },
  { path: "clients", label: "Clients" },
  { path: "tasks", label: "Tasks" },
];

const ZULBERA_NAV_LINKS = [
  { path: "analytics", label: "Analytics" },
  { path: "workers", label: "Workers" },
  { path: "clients", label: "Clients" },
  { path: "tasks", label: "Tasks" },
  { path: "comments", label: "Comments" },
  { path: "invoices", label: "Invoices" },
  { path: "domains", label: "Domains" },
  { path: "send-offer", label: "Send Offer" },
  { path: "timesheets", label: "Timesheets" },
];

const CLIENT_TABS = ["overview", "tasks", "invoices", "files", "domains"] as const;

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

  const primaryNav: { to: string; label: string; active: boolean }[] = isAdmin
    ? [
        { to: "/", label: "Analytics", active: isAnalytics },
        { to: "/admin/zulbera", label: "Zulbera", active: isOnZulberaSection },
        { to: "/admin/erasphere", label: "EraSphere", active: isOnEraSphereSection },
      ]
    : isWorker
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

  /* Drawer link styles */
  const drawerLink =
    "flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-[0.9375rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";
  const drawerActive =
    "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] shadow-elev-sm";
  const drawerInactive =
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]";
  const drawerSection = "px-4 pb-2 pt-5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";

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

          {/* Center: segmented primary nav (desktop) */}
          {token && primaryNav.length > 0 && (
            <div className="hidden min-w-0 items-center md:flex">
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                {primaryNav.map(({ to, label, active }) => (
                  <Link key={to} to={to} className={segItem(active)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

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

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${mobileMenuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity duration-200 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 flex h-full w-full max-w-[min(340px,100vw-2.5rem)] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-elev-lg transition-transform duration-250 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Navigation menu"
        >
          {/* Drawer header: user card */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
            {token ? (
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-nav-active-bg)] text-sm font-bold text-[var(--color-nav-active-text)]">
                  {initials(name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
                  <p className="text-xs capitalize text-[var(--color-text-muted)]">{role?.toLowerCase()}</p>
                </div>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Menu</span>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {token && isAdmin && (
              <>
                <p className={drawerSection}>Main</p>
                <div className="space-y-1">
                  <Link to="/" className={`${drawerLink} ${isAnalytics ? drawerActive : drawerInactive}`}>
                    Analytics
                  </Link>
                </div>
                <p className={drawerSection}>Zulbera</p>
                <div className="space-y-1">
                  {ZULBERA_NAV_LINKS.map(({ path, label }) => {
                    const to = `/admin/zulbera/${path}`;
                    const isActive =
                      location.pathname === to ||
                      (path === "analytics" && location.pathname === "/admin/zulbera");
                    const showBadge = path === "comments" && unreadCount > 0;
                    return (
                      <Link key={path} to={to} className={`${drawerLink} ${isActive ? drawerActive : drawerInactive}`}>
                        {label}
                        {showBadge && (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <p className={drawerSection}>EraSphere</p>
                <div className="space-y-1">
                  {ADMIN_ERASPHERE_TABS.map(({ path, label }) => {
                    const to = `/admin/erasphere/${path}`;
                    const isActive =
                      location.pathname === to ||
                      (path === "analytics" && location.pathname === "/admin/erasphere");
                    return (
                      <Link key={path} to={to} className={`${drawerLink} ${isActive ? drawerActive : drawerInactive}`}>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {token && isEraSphere && (
              <>
                <p className={drawerSection}>Navigation</p>
                <div className="space-y-1">
                  {ERASPHERE_TABS.map(({ path, label }) => {
                    const to = `/admin/${path}`;
                    const isActive =
                      location.pathname === to ||
                      (path === "erasphere-dashboard" && location.pathname === "/admin");
                    return (
                      <Link key={path} to={to} className={`${drawerLink} ${isActive ? drawerActive : drawerInactive}`}>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {token && isClient && (
              <>
                <p className={drawerSection}>Dashboard</p>
                <div className="space-y-1">
                  {CLIENT_TABS.map((tab) => (
                    <Link
                      key={tab}
                      to={`/dashboard?tab=${tab}`}
                      className={`${drawerLink} ${
                        isDashboard && clientTab === tab ? drawerActive : drawerInactive
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {token && isWorker && (
              <>
                <p className={drawerSection}>Dashboard</p>
                <div className="space-y-1">
                  <Link
                    to="/dashboard?tab=overview"
                    className={`${drawerLink} ${isDashboard && workerTab === "overview" ? drawerActive : drawerInactive}`}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/dashboard?tab=tasks"
                    className={`${drawerLink} ${isDashboard && workerTab === "tasks" ? drawerActive : drawerInactive}`}
                  >
                    Tasks
                  </Link>
                </div>
              </>
            )}

            {token && (
              <>
                <p className={drawerSection}>Account</p>
                <div className="space-y-1">
                  <Link to="/notifications" className={`${drawerLink} ${drawerInactive}`}>
                    Notifications
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/settings/notifications" className={`${drawerLink} ${drawerInactive}`}>
                    Notification settings
                  </Link>
                </div>
              </>
            )}

            {!token && (
              <div className="pt-4">
                <Link to="/login" className={`${drawerLink} ${drawerInactive}`}>
                  Log In
                </Link>
              </div>
            )}
          </div>

          {/* Drawer footer: logout pinned */}
          {token && (
            <div className="shrink-0 border-t border-[var(--color-border)] p-3 safe-bottom">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-destructive-text)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
