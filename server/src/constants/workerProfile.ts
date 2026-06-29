/**
 * Canonical worker-profile vocab (nickname / emoji / skills).
 * Kept in sync with the client list in client/src/constants/workerProfile.ts.
 */
export const WORKER_SKILLS = [
  "Frontend",
  "Backend",
  "Full-Stack",
  "UI/UX",
  "Graphic Design",
  "Branding",
  "Video / Motion",
  "Animation",
  "AI / ML",
  "Mobile",
  "SMM / Social",
  "Copywriting",
  "SEO",
  "QA / Testing",
  "DevOps",
] as const;

const SKILL_SET = new Set<string>(WORKER_SKILLS);

export const MAX_SKILLS = 5;
export const MAX_NICKNAME_LEN = 24;

/** Trim + cap a nickname; returns undefined if empty. */
export function sanitizeNickname(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().slice(0, MAX_NICKNAME_LEN);
  return v.length ? v : undefined;
}

/** Accept a single emoji (capped length to allow ZWJ sequences). */
export function sanitizeEmoji(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().slice(0, 16);
  return v.length ? v : undefined;
}

/** Keep only known skills, de-duped, capped at MAX_SKILLS. */
export function sanitizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s === "string" && SKILL_SET.has(s) && !out.includes(s)) out.push(s);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}
