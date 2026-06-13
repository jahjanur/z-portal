import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned actions (buttons, filters) — wrap on mobile */
  actions?: React.ReactNode;
  /** Optional content under the header (tabs, search) */
  children?: React.ReactNode;
  className?: string;
}

/** Consistent page header: title + subtitle left, actions right, responsive. */
export default function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`animate-fade-up ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}
