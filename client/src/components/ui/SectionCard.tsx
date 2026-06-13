import React from "react";

interface SectionCardProps {
  /** Heading shown top-left (rendered with the shared `section-title` style). */
  title?: React.ReactNode;
  /** Optional leading icon shown before the title. */
  icon?: React.ReactNode;
  /** Right-aligned content in the header (badge, count, link). */
  headerRight?: React.ReactNode;
  /** Card body. */
  children: React.ReactNode;
  /** Footer pinned under the body (e.g. a "View all" button). */
  footer?: React.ReactNode;
  /** Adds an accent border + matching icon tint for emphasis (e.g. overdue). */
  tone?: "neutral" | "danger";
  className?: string;
  /** Extra classes applied to the body wrapper. */
  bodyClassName?: string;
}

const TONE_BORDER: Record<NonNullable<SectionCardProps["tone"]>, string> = {
  neutral: "",
  danger: "border-[var(--color-destructive-border)]",
};

/**
 * Reusable panel used across dashboards and list pages.
 * Wraps the repeated `card-panel` + `section-title` header pattern so every
 * page renders sections consistently (light/dark via theme tokens).
 */
export default function SectionCard({
  title,
  icon,
  headerRight,
  children,
  footer,
  tone = "neutral",
  className = "",
  bodyClassName = "",
}: SectionCardProps) {
  return (
    <section className={`card-panel p-5 sm:p-6 ${TONE_BORDER[tone]} ${className}`}>
      {(title || headerRight || icon) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <span
                className={`shrink-0 ${
                  tone === "danger" ? "text-[var(--color-destructive-text)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {icon}
              </span>
            )}
            {title && <h3 className="section-title truncate">{title}</h3>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}
