import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const name = localStorage.getItem("name");

const navLinkBase =
  "rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]";
const navLinkActive = "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]";
const navLinkInactive =
  "border border-[var(--color-nav-link-border)] text-[var(--color-nav-link-text)] hover:border-[var(--color-nav-link-hover-border)] hover:bg-[var(--color-nav-link-hover-bg)] hover:text-[var(--color-nav-link-hover-text)]";

export default function Navbar() {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const isAdmin = role === "ADMIN";
  const location = useLocation();
  const isAnalytics = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
      <div className="px-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/ZPortalLogo.svg"
                alt="Z-Portal Logo"
                className="h-16 transition-transform group-hover:scale-110"
              />
            </Link>

            <div className="items-center hidden gap-1 md:flex">
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
                  to="/dashboard"
                  className={`${navLinkBase} ${isDashboard ? navLinkActive : navLinkInactive}`}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {token ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-glass)] border border-[var(--color-border)]">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{name}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-secondary rounded-full px-4 py-2 text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-full border border-[var(--color-border-hover)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-btn-ghost-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
