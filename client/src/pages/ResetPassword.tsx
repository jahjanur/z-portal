import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import API from "../api";
import Button from "../components/ui/Button";

type State = "checking" | "valid" | "invalid" | "done";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<State>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); setError("This reset link is missing its token."); return; }
    let active = true;
    API.get(`/auth/reset/${token}`)
      .then((res) => { if (active) { setEmail(res.data?.email ?? null); setState("valid"); } })
      .catch((err) => {
        if (active) { setState("invalid"); setError(err?.response?.data?.message ?? "This reset link is invalid or has expired."); }
      });
    return () => { active = false; };
  }, [token]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("The passwords don't match."); return; }
    setSaving(true);
    try {
      await API.post("/auth/reset", { token, password });
      setState("done");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Couldn't reset the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/50 via-[var(--color-overlay)]/40 to-[var(--color-overlay)]/50" aria-hidden />
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-elev-lg backdrop-blur-2xl">
          <div className="relative p-6 sm:p-10">
            <div className="mb-6 flex flex-col items-center gap-4">
              <img src="/Zulbera-Text-Logo.svg" alt="Zulbera" className="h-10 w-auto max-w-[200px] object-contain" />
            </div>

            {state === "checking" && (
              <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Checking your reset link…</p>
            )}

            {state === "invalid" && (
              <div className="text-center">
                <h1 className="page-title mb-2">Link expired</h1>
                <p className="page-subtitle mb-6">{error}</p>
                <Link to="/login" className="btn-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold">
                  Back to sign in
                </Link>
              </div>
            )}

            {state === "done" && (
              <div className="text-center">
                <h1 className="page-title mb-2">Password updated</h1>
                <p className="page-subtitle mb-6">You can now sign in with your new password. Redirecting…</p>
                <Link to="/login" className="btn-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold">
                  Go to sign in
                </Link>
              </div>
            )}

            {state === "valid" && (
              <>
                <div className="mb-8 text-center">
                  <h1 className="page-title mb-2">Set a new password</h1>
                  <p className="page-subtitle">{email ? `for ${email}` : "Choose a new password for your account"}</p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-5">
                  <div>
                    <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">New password</label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="input-dark w-full px-4 py-3 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Confirm password</label>
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="input-dark w-full px-4 py-3"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" loading={saving} className="mt-1 w-full">
                    {saving ? "Updating…" : "Update password"}
                  </Button>
                </form>

                {error && (
                  <p role="alert" className="mt-5 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 text-sm font-medium text-[var(--color-destructive-text)] animate-fade-in">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
