import React, { useId } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]",
  danger: "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border-[var(--color-destructive-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]",
};

/** Tiny inline-SVG sparkline — no chart library overhead for the KPI cards. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = useId().replace(/:/g, "");
  if (!data || data.length < 2) return null;
  const w = 120;
  const h = 34;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  /** percent change vs previous period; positive = up. `null` renders "New". `undefined` hides the badge. */
  delta?: number | null;
  /** label shown next to the delta, e.g. "vs last month" */
  deltaLabel?: string;
  /** when true, a downward delta is the "good" direction (e.g. attention items) */
  invertDelta?: boolean;
  sparkline?: number[];
  sparkColor?: string;
  hint?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** KPI card with trend delta vs previous period + mini sparkline. */
export default function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  delta,
  deltaLabel,
  invertDelta = false,
  sparkline,
  sparkColor = "var(--color-text-secondary)",
  hint,
  onClick,
  className = "",
}: MetricCardProps) {
  const Tag = onClick ? "button" : "div";
  const hasDelta = delta !== undefined;
  const isNew = delta === null;
  const up = (delta ?? 0) >= 0;
  const good = invertDelta ? !up : up;

  return (
    <Tag
      onClick={onClick}
      className={`card-panel card-panel-hover group relative w-full overflow-hidden p-5 text-left ${
        onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" : ""
      } ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "var(--halo)" }}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[0.8125rem] font-medium text-[var(--color-text-muted)]">{label}</p>
        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-200 group-hover:scale-105 ${ICON_TONE[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 truncate text-[1.4rem] font-bold leading-none tracking-tight text-[var(--color-text-primary)] sm:text-[1.75rem] lg:text-[2rem]">
        {value}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {hasDelta &&
          (isNew ? (
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--color-text-muted)]">
              New
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold ${
                good
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                  : "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)]"
              }`}
            >
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta as number).toFixed(0)}%
            </span>
          ))}
        {hasDelta && deltaLabel && (
          <span className="truncate text-[0.6875rem] text-[var(--color-text-muted)]">{deltaLabel}</span>
        )}
      </div>

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3 -mb-1">
          <Sparkline data={sparkline} color={sparkColor} />
        </div>
      )}

      {hint && <div className="mt-2 text-xs text-[var(--color-text-muted)]">{hint}</div>}
    </Tag>
  );
}
