import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { login } from "../services/auth";
import Button from "../components/ui/Button";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const redirect = searchParams.get("redirect");
      window.location.href = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
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
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/50 via-[var(--color-overlay)]/40 to-[var(--color-overlay)]/50"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-elev-lg backdrop-blur-2xl">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_var(--color-border)]"
            aria-hidden
          />
          <div className="relative p-6 sm:p-10">
            {/* Brand mark */}
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-3)] shadow-elev-sm">
                <span className="font-display text-2xl font-bold leading-none text-[var(--color-text-primary)]">
                  Z
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-success-text)] shadow-[0_0_8px_var(--color-success-text)]"
                  aria-hidden
                />
                <span className="text-xs font-medium tracking-wide text-[var(--color-text-secondary)]">
                  Secure Portal
                </span>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h1 className="page-title mb-2">
                Welcome <span className="text-[var(--color-text-muted)]">back</span>
              </h1>
              <p className="page-subtitle">Sign in to your Zulbera account</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input-dark w-full px-4 py-3"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="input-dark w-full px-4 py-3 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {message && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 animate-fade-in"
              >
                <svg
                  className="h-5 w-5 shrink-0 text-[var(--color-destructive-text)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-[var(--color-destructive-text)]">{message}</p>
              </div>
            )}

            <div className="mt-6 border-t border-[var(--color-border)] pt-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                Need an account?{" "}
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  Contact your administrator
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
