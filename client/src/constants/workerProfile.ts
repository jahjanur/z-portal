/**
 * Worker-profile vocab + display helpers (nickname / emoji / skills).
 * Skill list is kept in sync with server/src/constants/workerProfile.ts.
 */

export const MAX_SKILLS = 5;
export const MAX_NICKNAME_LEN = 24;

/** Curated emoji avatars workers can pick from during onboarding. */
export const AVATAR_EMOJIS = [
  "🚀", "⭐", "🔥", "⚡", "🎯", "💎", "🦄", "🐉",
  "🦊", "🐺", "🦁", "🐯", "🐼", "🐧", "🦉", "🦅",
  "🎨", "🖌️", "🎬", "🎮", "🎧", "📸", "💻", "🛠️",
  "🧠", "🤖", "👾", "🌌", "🌈", "🍀", "🌙", "☄️",
  "🥷", "🧙", "🦸", "🧩", "♟️", "🎲", "🏆", "💡",
] as const;

export interface SkillMeta {
  label: string;
  /** Tailwind classes for the badge (bg + text + ring), tuned for dark UI. */
  className: string;
}

/** Canonical skills with their badge colors. Order = display order in pickers. */
export const SKILLS: SkillMeta[] = [
  { label: "Frontend", className: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  { label: "Backend", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  { label: "Full-Stack", className: "bg-teal-500/15 text-teal-300 ring-teal-400/30" },
  { label: "UI/UX", className: "bg-violet-500/15 text-violet-300 ring-violet-400/30" },
  { label: "Graphic Design", className: "bg-pink-500/15 text-pink-300 ring-pink-400/30" },
  { label: "Branding", className: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
  { label: "Video / Motion", className: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
  { label: "Animation", className: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  { label: "AI / ML", className: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30" },
  { label: "Mobile", className: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30" },
  { label: "SMM / Social", className: "bg-blue-500/15 text-blue-300 ring-blue-400/30" },
  { label: "Copywriting", className: "bg-lime-500/15 text-lime-300 ring-lime-400/30" },
  { label: "SEO", className: "bg-green-500/15 text-green-300 ring-green-400/30" },
  { label: "QA / Testing", className: "bg-yellow-500/15 text-yellow-300 ring-yellow-400/30" },
  { label: "DevOps", className: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30" },
];

export const SKILL_LABELS = SKILLS.map((s) => s.label);

const SKILL_BY_LABEL = new Map(SKILLS.map((s) => [s.label, s]));
const DEFAULT_SKILL_CLASS = "bg-white/10 text-[var(--color-text-secondary)] ring-white/15";

export function skillClass(label: string): string {
  return SKILL_BY_LABEL.get(label)?.className ?? DEFAULT_SKILL_CLASS;
}

/** Minimal shape needed to render a person consistently across the app. */
export interface DisplayUser {
  name?: string | null;
  nickname?: string | null;
  avatarEmoji?: string | null;
  skills?: string[] | null;
  role?: string | null;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "?";
}

const STAFF_VIEWERS = new Set(["ADMIN", "ERASPHERE"]);

/**
 * Primary label to show for a user, given who is looking.
 * - Admin / EraSphere viewers always see the real name (they manage people).
 * - Everyone else sees the worker's chosen nickname (falling back to name).
 */
export function displayName(user: DisplayUser, viewerRole?: string | null): string {
  const real = user.name?.trim() || "User";
  if (viewerRole && STAFF_VIEWERS.has(viewerRole.toUpperCase())) return real;
  return user.nickname?.trim() || real;
}

/** Secondary line under the primary label (or null when there's nothing to add). */
export function displaySubtitle(user: DisplayUser, viewerRole?: string | null): string | null {
  const isStaff = viewerRole ? STAFF_VIEWERS.has(viewerRole.toUpperCase()) : false;
  const nick = user.nickname?.trim();
  // Staff see the nickname as the secondary line; others don't need the real name.
  if (isStaff && nick) return nick;
  return null;
}

/** What to render inside an avatar circle: the emoji if set, else initials. */
export function avatarGlyph(user: DisplayUser): string {
  return user.avatarEmoji?.trim() || initials(user.name);
}
