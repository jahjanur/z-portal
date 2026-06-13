import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** compact = less vertical padding (for inside cards) */
  compact?: boolean;
}

/** Consistent empty state used across lists, tables and dashboards. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`card-panel flex flex-col items-center justify-center text-center ${
        compact ? "px-6 py-8" : "px-6 py-14"
      } ${className}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
        {icon ?? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5l-2 2h-2l-2-2H4" />
          </svg>
        )}
      </div>
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
