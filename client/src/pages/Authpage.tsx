import { useState, useEffect } from "react";
import { login } from "../services/auth";

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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMessage("");
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="relative flex items-center justify-center min-h-screen p-6 bg-app-grid">
      {/* Dark overlay behind card for readability */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md">
        {/* Glass card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-2xl">
          {/* Soft inner highlight */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            aria-hidden
          />
          <div className="relative p-10">
            {/* Secure Portal pill */}
            <div className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-sm font-medium text-white/80">Secure Portal</span>
              </div>
            </div>

            {/* Headline + subtext */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-white/95 sm:text-4xl">
                Welcome <span className="text-white/70">Back</span>
              </h1>
              <p className="text-sm text-white/60">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-white/80">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white/95 placeholder:text-white/30 transition-colors hover:border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 focus:ring-offset-transparent"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-white/80">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white/95 placeholder:text-white/30 transition-colors hover:border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 focus:ring-offset-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-2xl bg-accent py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {message && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-300">{message}</p>
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-white/55">
                Need an account? <span className="font-semibold text-white/75">Contact your administrator</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
