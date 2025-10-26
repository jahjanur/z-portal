import { Link } from "react-router-dom";

const colors = {
  primary: "#5B4FFF",
  hover: "#7C73FF",
  text: "#1A1A2E",
  accent: "#FFA726",
};

const name = localStorage.getItem("name");

export default function Navbar() {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const isAdmin = role === "ADMIN";

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 shadow-sm bg-white/95 backdrop-blur-md">
      <div className="px-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src="/EcoreLogo.svg" 
                alt="Ecore Logo" 
                className="h-16 transition-transform group-hover:scale-110"
              />
            </Link>

            <div className="items-center hidden space-x-1 md:flex">
              {token && isAdmin && (
                <Link 
                  to="/" 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 transition-all rounded-lg hover:text-gray-900 hover:bg-gray-100"
                >
                  Analytics
                </Link>
              )}
              
              {token && (
                <Link 
                  to="/dashboard" 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 transition-all rounded-lg hover:text-gray-900 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg shadow-lg hover:scale-105 hover:shadow-xl"
                  style={{ 
                    backgroundColor: colors.primary,
                    boxShadow: `0 4px 14px 0 ${colors.primary}40`
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg shadow-lg hover:scale-105 hover:shadow-xl"
                style={{ 
                  backgroundColor: colors.primary,
                  boxShadow: `0 4px 14px 0 ${colors.primary}40`
                }}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}