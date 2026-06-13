import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

interface InviteInfo {
  role: string;
  email: string;
  name: string;
  company?: string | null;
}

function strengthScore(pw: string): number {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];

/** Map a 1-5 strength score to semantic theme tokens (monochrome-safe). */
function strengthToken(score: number): string {
  if (score <= 2) return "var(--color-destructive-text)";
  if (score <= 3) return "var(--color-warning-text)";
  return "var(--color-success-text)";
}

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }
    API.get<InviteInfo>(`/invites/validate`, { params: { token } })
      .then((res) => setInfo(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.error || "Invalid or expired invitation link.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const score = useMemo(() => strengthScore(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await API.post("/invites/accept", { token, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("userId", data.user.id.toString());
      localStorage.setItem("name", data.user.name);

      window.location.href = "/dashboard";
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || "Failed to create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Spinner page size="lg" label="Validating invitation..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/50 via-[var(--color-overlay)]/40 to-[var(--color-overlay)]/50"
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-md animate-fade-up">
          <EmptyState
            icon={
              <svg className="h-6 w-6 text-[var(--color-destructive-text)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            }
            title="Invitation Invalid"
            description={error}
            action={
              <a href="/login" className="btn-secondary h-11 px-5 text-sm">
                Go to Login
              </a>
            }
          />
        </div>
      </div>
    );
  }

  if (!info) return null;

  const roleLabel = info.role === "ERASPHERE" ? "EraSphere Partner" : info.role === "WORKER" ? "Worker" : "Client";

  let heroMessage: string;
  switch (info.role) {
    case "WORKER":
      heroMessage = "You've been invited to join Zulbera as a Worker.";
      break;
    case "ERASPHERE":
      heroMessage = "You've been invited to join the EraSphere Partner Program.";
      break;
    default:
      heroMessage = info.company
        ? `Zulbera has created a workspace for ${info.company}.`
        : "Zulbera has created a workspace for you.";
      break;
  }

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
            {/* Brand */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-3)] shadow-elev-sm">
                <span className="font-display text-2xl font-bold leading-none text-[var(--color-text-primary)]">
                  Z
                </span>
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Zulbera
              </h1>
            </div>

            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-success-text)] shadow-[0_0_8px_var(--color-success-text)]"
                  aria-hidden
                />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{roleLabel}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{heroMessage}</p>
            </div>

            {/* Pre-filled info */}
            <div className="mb-6 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Name</label>
                <div className="input-dark w-full cursor-default px-4 py-2.5 text-sm opacity-70">{info.name}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Email</label>
                <div className="input-dark w-full cursor-default px-4 py-2.5 text-sm opacity-70">{info.email}</div>
              </div>
              {info.company && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Company</label>
                  <div className="input-dark w-full cursor-default px-4 py-2.5 text-sm opacity-70">{info.company}</div>
                </div>
              )}
            </div>

            {/* Password form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="invite-pw"
                  className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="invite-pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
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

                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="mt-3 animate-fade-in" aria-live="polite">
                    <div className="flex gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-2 flex-1 rounded-full transition-colors duration-300"
                          style={{
                            backgroundColor: i < score ? strengthToken(score) : "var(--color-border)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: strengthToken(score) }}>
                        {STRENGTH_LABELS[Math.max(0, score - 1)]}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {score < 5 ? "Tip: 10+ chars, uppercase, number, symbol" : "Excellent password"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="invite-pw2"
                  className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                >
                  Confirm Password
                </label>
                <input
                  id="invite-pw2"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-dark w-full px-4 py-3"
                />
              </div>

              <Button type="submit" variant="primary" size="lg" loading={submitting} className="mt-1 w-full">
                {submitting ? "Creating account..." : "Set Up Your Account"}
              </Button>
            </form>

            {submitError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 animate-fade-in"
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
                <p className="text-sm font-medium text-[var(--color-destructive-text)]">{submitError}</p>
              </div>
            )}

            <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">
                Already have an account?{" "}
                <a href="/login" className="font-semibold text-[var(--color-text-secondary)] hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
