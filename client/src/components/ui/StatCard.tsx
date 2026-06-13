import React from "react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Small line under the value (trend, context) */
  hint?: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
  onClick?: () => void;
}

const ICON_TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral:
    "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]",
  warning:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]",
  danger:
    "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border-[var(--color-destructive-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]",
};

/** KPI / metric card used across dashboards. */
export default function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  className = "",
  onClick,
}: StatCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`card-panel card-panel-hover w-full p-5 text-left ${
        onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[0.8125rem] font-medium text-[var(--color-text-muted)]">
          {label}
        </p>
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${ICON_TONE[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-[1.75rem]">
        {value}
      </p>
      {hint && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</div>}
    </Tag>
  );
}
