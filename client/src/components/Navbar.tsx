import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";
import logoLight from "../assets/Artboard 2.svg";
import logoDark from "../assets/Artboard 2_1.svg";

const name = localStorage.getItem("name");

const navLinkBase =
  "rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";
const navLinkActive = "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]";
const navLinkInactive =
  "border border-[var(--color-nav-link-border)] text-[var(--color-nav-link-text)] hover:border-[var(--color-nav-link-hover-border)] hover:bg-[var(--color-nav-link-hover-bg)] hover:text-[var(--color-nav-link-hover-text)]";

const ADMIN_TABS = [
  { path: "workers", label: "Workers" },
  { path: "clients", label: "Clients" },
  { path: "tasks", label: "Tasks" },
  { path: "invoices", label: "Invoices" },
  { path: "domains", label: "Domains" },
  { path: "send-offer", label: "Send Offer" },
  { path: "timesheets", label: "Timesheets" },
];

export default function Navbar() {
  const { theme } = useTheme();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const isAdmin = role === "ADMIN";
  const location = useLocation();
  const isAnalytics = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/admin");
  const logoSrc = theme === "dark" ? logoDark : logoLight;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const mobileLinkClass = "block w-full rounded-lg border border-transparent px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";
  const mobileLinkActive = "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border-hover)]";
  const mobileLinkInactive = "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]";

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="px-4 sm:px-6 mx-auto max-w-[1920px]">
          <div className="flex items-center justify-between h-16 gap-2 min-w-0">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1 overflow-x-auto">
              <Link to="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMobileMenuOpen(false)}>
                <img
                  src={logoSrc}
                  alt="Z-Portal Logo"
                  className="h-7 transition-transform group-hover:scale-105"
                />
              </Link>

            {/* Desktop: Analytics + Dashboard */}
            <div className="items-center gap-1 shrink-0 hidden md:flex">
              {token && isAdmin && (
                <Link
                  to="/"
                  className={`${navLinkBase} ${isAnalytics ? navLinkActive : navLinkInactive}`}
                >
                  Analytics
                </Link>
              )}
              {token && (
                <Link
                  to={isAdmin ? "/admin/workers" : "/dashboard"}
                  className={`${navLinkBase} ${isDashboard ? navLinkActive : navLinkInactive}`}
                >
                  Dashboard
                </Link>
              )}
            </div>

            {/* Desktop: Admin tabs */}
            {token && isAdmin && (
              <div className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto overflow-y-hidden py-1" style={{ scrollbarWidth: "thin" }}>
                {ADMIN_TABS.map(({ path, label }) => (
                  <NavLink
                    key={path}
                    to={`/admin/${path}`}
                    end={path === "workers"}
                    className={({ isActive }) =>
                      `shrink-0 snap-start rounded-lg border px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
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
            )}
          </div>

          {/* Desktop: right side (theme + user + logout; on mobile only hamburger) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            {token ? (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-glass)] border border-[var(--color-border)]">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{name}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden md:inline-flex btn-secondary rounded-full px-4 py-2 text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 rounded-full border border-[var(--color-border-hover)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-btn-ghost-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Log In
              </Link>
            )}

            {/* Mobile: hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>

      {/* Mobile menu overlay + panel */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-[min(320px,100vw-2rem)] border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl transition-transform duration-200 ease-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto py-4 max-h-[calc(100vh-4rem)]">
            <div className="px-2 space-y-1">
              {token && isAdmin && (
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${mobileLinkClass} ${isAnalytics ? mobileLinkActive : mobileLinkInactive}`}
                >
                  Analytics
                </Link>
              )}
              {token && (
                <Link
                  to={isAdmin ? "/admin/workers" : "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${mobileLinkClass} ${isDashboard ? mobileLinkActive : mobileLinkInactive}`}
                >
                  Dashboard
                </Link>
              )}
              {token && isAdmin && (
                <>
                  <div className="mx-4 mt-3 mb-1 border-t border-[var(--color-border)]" />
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Admin</p>
                  {ADMIN_TABS.map(({ path, label }) => {
                    const to = `/admin/${path}`;
                    const isActive = location.pathname === to || (path === "workers" && location.pathname === "/admin");
                    return (
                      <Link
                        key={path}
                        to={to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`${mobileLinkClass} ${isActive ? mobileLinkActive : mobileLinkInactive}`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </>
              )}
              <div className="mx-4 mt-3 mb-1 border-t border-[var(--color-border)]" />
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-[var(--color-text-muted)]">Theme</span>
                <ThemeToggle />
              </div>
              {token ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-surface-2)] mx-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <span className="text-sm font-medium text-[var(--color-text-secondary)] truncate">{name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className={`${mobileLinkClass} ${mobileLinkInactive} w-full mx-0 rounded-lg border-[var(--color-border)] text-[var(--color-destructive-text)] hover:bg-[var(--color-destructive-bg)]`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${mobileLinkClass} ${mobileLinkInactive} flex items-center gap-2`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
