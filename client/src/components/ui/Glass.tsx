import React from "react";

const glassBase =
  "rounded-xl border border-[var(--color-border)] shadow-lg shadow-[var(--color-shadow)] backdrop-blur-md transition hover:border-[var(--color-border-hover)]";
const panelBase =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-lg shadow-[var(--color-shadow)] backdrop-blur-md";

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`${glassBase} bg-[var(--color-surface-2)] p-4 ${className}`}>{children}</div>
);

export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`${panelBase} bg-[var(--color-surface-2)] p-6 ${className}`}>{children}</div>
);

export const GlassRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`${glassBase} flex items-center gap-4 bg-[var(--color-surface-2)] p-4 transition hover:bg-[var(--color-surface-3)] hover:-translate-y-[1px] ${className}`}
  >
    {children}
  </div>
);

export const NeutralBadge: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger";
}> = ({ children, className = "", variant = "default" }) => {
  const variants = {
    default:
      "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border-[var(--color-border-hover)]",
    success: "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border-emerald-500/30",
    warning: "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border-amber-500/30",
    danger:
      "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border-[var(--color-destructive-border)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default { GlassCard, GlassPanel, GlassRow, NeutralBadge };
