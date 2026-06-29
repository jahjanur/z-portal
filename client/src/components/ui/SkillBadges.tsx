import { skillClass } from "../../constants/workerProfile";

interface SkillBadgesProps {
  skills?: string[] | null;
  /** Cap how many to show; the rest collapse into a "+N" chip. */
  max?: number;
  size?: "xs" | "sm";
  className?: string;
}

/** Renders a worker's skill tags as small colored badges. */
export default function SkillBadges({ skills, max, size = "xs", className = "" }: SkillBadgesProps) {
  if (!skills || skills.length === 0) return null;
  const shown = typeof max === "number" ? skills.slice(0, max) : skills;
  const overflow = skills.length - shown.length;
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((s) => (
        <span
          key={s}
          className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${pad} ${skillClass(s)}`}
        >
          {s}
        </span>
      ))}
      {overflow > 0 && (
        <span className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset bg-white/10 text-[var(--color-text-muted)] ring-white/15 ${pad}`}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
