import { Link, useLocation } from "react-router-dom";

const name = localStorage.getItem("name");

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
    <nav className="fixed top-0 z-50 w-full border-b border-border-subtle bg-app/95 backdrop-blur-md">
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
                  className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                    isAnalytics
                      ? "bg-white text-app"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Analytics
                </Link>
              )}
              {token && (
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                    isDashboard
                      ? "bg-white text-app"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass border border-border-subtle">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-300">{name}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-semibold rounded-full bg-white text-app hover:bg-gray-200 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-border-medium text-white hover:bg-white/10 transition-all"
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
