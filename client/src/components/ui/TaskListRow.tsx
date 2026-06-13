import React from "react";
import StatusBadge from "./StatusBadge";

interface TaskListRowProps {
  title: string;
  /** Secondary line under the title (e.g. client name). */
  subtitle?: React.ReactNode;
  /** Task status — rendered as a StatusBadge on the right. */
  status?: string | null;
  /** Optional badge/chips shown under the subtitle (e.g. "Overdue by 3 days"). */
  badge?: React.ReactNode;
  onClick?: () => void;
  /** Highlights the row with the destructive accent border. */
  danger?: boolean;
  className?: string;
}

/**
 * Compact, clickable task row used in dashboard "recent / overdue" lists.
 * Keyboard accessible (Enter/Space) when interactive.
 */
export default function TaskListRow({
  title,
  subtitle,
  status,
  badge,
  onClick,
  danger = false,
  className = "",
}: TaskListRowProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`card-panel card-panel-hover p-4 ${
        interactive
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          : ""
      } ${danger ? "border-[var(--color-destructive-border)]" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{title}</h4>
          {subtitle && <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
          {badge && <div className="mt-2">{badge}</div>}
        </div>
        {status !== undefined && <StatusBadge status={status} className="shrink-0" />}
      </div>
    </div>
  );
}
