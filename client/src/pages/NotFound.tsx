import { Link } from "react-router-dom";

/** Branded 404 page — Zulbera mascot on a glass card. Shown for any unknown route. */
export default function NotFound() {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-auto bg-[var(--color-bg)] px-4 py-16">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[var(--color-overlay)]/40 via-transparent to-[var(--color-overlay)]/40"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 shadow-elev-lg backdrop-blur-2xl sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_var(--color-border)]"
            aria-hidden
          />
          <img
            src="/404ZulBot.png"
            alt="404 — page not found"
            className="relative mx-auto mb-6 h-56 w-auto object-contain drop-shadow-2xl"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Page not found
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
            The page you're looking for doesn't exist or may have moved — even our bot couldn't track it down.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link to="/" className="btn-primary inline-flex h-11 items-center justify-center px-6 text-sm">
              Back to home
            </Link>
            {!token && (
              <Link to="/login" className="btn-secondary inline-flex h-11 items-center justify-center px-6 text-sm">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
