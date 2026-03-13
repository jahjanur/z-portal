import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api";

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
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-[var(--color-text-muted)]">Validating invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/50 via-[var(--color-overlay)]/40 to-[var(--color-overlay)]/50" aria-hidden />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-xl p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <svg className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">Invitation Invalid</h2>
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">{error}</p>
            <a
              href="/login"
              className="inline-block rounded-xl bg-[var(--color-surface-3)] px-6 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              Go to Login
            </a>
          </div>
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
    <div className="relative flex items-center justify-center min-h-screen p-6">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/50 via-[var(--color-overlay)]/40 to-[var(--color-overlay)]/50" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-xl backdrop-blur-2xl">
          <div className="p-10">
            {/* Header */}
            <div className="mb-6 flex justify-center">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Zulbera</h1>
            </div>

            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">{roleLabel}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{heroMessage}</p>
            </div>

            {/* Pre-filled info */}
            <div className="mb-6 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Name</label>
                <div className="input-dark w-full px-4 py-2.5 text-sm opacity-70 cursor-default">{info.name}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Email</label>
                <div className="input-dark w-full px-4 py-2.5 text-sm opacity-70 cursor-default">{info.email}</div>
              </div>
              {info.company && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Company</label>
                  <div className="input-dark w-full px-4 py-2.5 text-sm opacity-70 cursor-default">{info.company}</div>
                </div>
              )}
            </div>

            {/* Password form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="invite-pw" className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Password
                </label>
                <input
                  id="invite-pw"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-dark w-full px-4 py-3"
                />
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{ backgroundColor: i < score ? STRENGTH_COLORS[score - 1] : "var(--color-border)" }}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: STRENGTH_COLORS[Math.max(0, score - 1)] }}>
                      {STRENGTH_LABELS[Math.max(0, score - 1)]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="invite-pw2" className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
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
                  className="input-dark w-full px-4 py-3"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary mt-1 w-full rounded-2xl py-3.5 text-base shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating account..." : "Set Up Your Account"}
              </button>
            </form>

            {submitError && (
              <div className="mt-4 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-3">
                <p className="text-sm text-[var(--color-destructive-text)]">{submitError}</p>
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
