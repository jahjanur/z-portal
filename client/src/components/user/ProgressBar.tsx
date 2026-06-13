import React from "react";

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  /** Legacy props — superseded by design tokens, kept for API compatibility */
  color?: string;
  labelColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, total }) => {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <div
          className="h-full rounded-full bg-[var(--color-nav-active-bg)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
