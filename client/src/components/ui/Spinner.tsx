interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Center inside parent with generous padding (page-level loading) */
  page?: boolean;
  label?: string;
}

const SIZES = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-9 w-9" };

/** Brand spinner: thin ring in the current text color. */
export default function Spinner({ size = "md", className = "", page = false, label }: SpinnerProps) {
  const ring = (
    <svg
      className={`animate-spin text-[var(--color-text-muted)] ${SIZES[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label ?? "Loading"}
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0110 10h-3a7 7 0 00-7-7V2z" />
    </svg>
  );
  if (!page) return ring;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      {ring}
      {label && <p className="text-sm text-[var(--color-text-muted)]">{label}</p>}
    </div>
  );
}
