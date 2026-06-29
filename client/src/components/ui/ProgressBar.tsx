interface ProgressBarProps {
  percent: number;
  /** Visual height. */
  size?: "xs" | "sm" | "md";
  className?: string;
}

/** Theme-aware progress bar. Turns green at 100%. */
export default function ProgressBar({ percent, size = "sm", className = "" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const h = size === "xs" ? "h-1" : size === "md" ? "h-2.5" : "h-1.5";
  const done = pct >= 100;
  return (
    <div className={`w-full overflow-hidden rounded-full bg-[var(--color-surface-3)] ${h} ${className}`}>
      <div
        className={`${h} rounded-full transition-[width] duration-500 ease-out`}
        style={{
          width: `${pct}%`,
          background: done ? "var(--color-success-text)" : "var(--color-accent, #6D5EF8)",
        }}
      />
    </div>
  );
}
