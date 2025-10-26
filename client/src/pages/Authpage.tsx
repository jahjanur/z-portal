// client/src/pages/AuthPage.tsx
import { useState } from "react";
import { login } from "../services/auth";

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  light: "#F8F9FA",
  dark: "#1A1A2E",
};

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setMessage("");
  setLoading(true);

  try {
    const res = await login(email, password);
    console.log(res.user);

    localStorage.setItem("token", res.token);
    localStorage.setItem("role", res.user.role);
    localStorage.setItem("userId", res.user.id.toString());
    localStorage.setItem("name", res.user.name);
    window.location.href = "/dashboard";
  } catch (err: unknown) {
    setMessage(err instanceof Error ? err.message : "Login failed");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute rounded-full opacity-20 blur-3xl -top-20 -right-20 w-96 h-96"
          style={{ backgroundColor: colors.primary }}
        />
        <div 
          className="absolute rounded-full opacity-10 blur-3xl -bottom-20 -left-20 w-96 h-96"
          style={{ backgroundColor: colors.accent }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="relative p-10 overflow-hidden bg-white border border-gray-200 shadow-xl rounded-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 border border-gray-200 rounded-full bg-gray-50">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }}></div>
              <span className="text-sm font-medium text-gray-700">Secure Portal</span>
            </div>
            
            <h2 className="mb-2 text-3xl font-bold text-gray-900">
              Welcome <span style={{ color: colors.primary }}>Back</span>
            </h2>
            <p className="text-sm text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 text-gray-900 placeholder-gray-400 transition-all bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ 
                  '--tw-ring-color': colors.primary 
                } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 text-gray-900 placeholder-gray-400 transition-all bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ 
                  '--tw-ring-color': colors.primary 
                } as React.CSSProperties}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 mt-2 font-semibold text-white transition-all rounded-xl hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 10px 30px -10px ${colors.primary}40`
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {message && (
            <div className="p-4 mt-4 border border-red-200 bg-red-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="flex-shrink-0 w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{message}</p>
              </div>
            </div>
          )}

          <div className="pt-6 mt-6 text-center border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need an account? <span className="font-semibold text-gray-900">Contact your administrator</span>
            </p>
          </div>

          {/* Decorative corner elements */}
          <div 
            className="absolute w-24 h-24 rounded-full opacity-10 -top-12 -right-12 blur-2xl"
            style={{ backgroundColor: colors.primary }}
          />
          <div 
            className="absolute w-20 h-20 rounded-full opacity-10 -bottom-10 -left-10 blur-2xl"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>
    </div>
  );
}