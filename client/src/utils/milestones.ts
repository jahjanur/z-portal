/** A chat message linked to a to-do (preview shown inside the to-do modal). */
export interface LinkedComment {
  id: number;
  content: string;
  createdAt: string;
  visibleToClient: boolean;
  user?: { id: number; name?: string | null; nickname?: string | null; avatarEmoji?: string | null; role?: string | null } | null;
}

export interface Milestone {
  id: number;
  taskId: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  pushedToGithub?: boolean;
  deployed?: boolean;
  isDone: boolean;
  doneAt?: string | null;
  doneBy?: number | null;
  priority?: string | null;
  createdById: number;
  order: number;
  createdAt: string;
  /** Messages linked to this to-do (join rows, each carrying the comment preview). */
  commentLinks?: { comment: LinkedComment }[] | null;
}

/* -------------------------------- priority ------------------------------- */

export type Priority = "HIGH" | "MEDIUM" | "LOW";

/** Order High → Medium → Low; the three selectable to-do priorities. */
export const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];

interface PriorityMeta {
  value: Priority;
  label: string;
  /** rank for sorting (0 = highest priority) */
  rank: number;
  /** badge classes (bg + text + ring), matching the app's tone tokens */
  badge: string;
  /** solid colour dot */
  dot: string;
  /** classes for the selected pill in the priority picker */
  pill: string;
}

const PRIORITY_META: Record<Priority, PriorityMeta> = {
  HIGH: {
    value: "HIGH",
    label: "High",
    rank: 0,
    badge: "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] ring-[var(--color-destructive-border)]",
    dot: "bg-[var(--color-destructive-text)]",
    pill: "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] ring-[var(--color-destructive-border)]",
  },
  MEDIUM: {
    value: "MEDIUM",
    label: "Medium",
    rank: 1,
    badge: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] ring-[var(--color-warning-border)]",
    dot: "bg-[var(--color-warning-text)]",
    pill: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] ring-[var(--color-warning-border)]",
  },
  LOW: {
    value: "LOW",
    label: "Low",
    rank: 2,
    badge: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] ring-[var(--color-info-border)]",
    dot: "bg-[var(--color-info-text)]",
    pill: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] ring-[var(--color-info-border)]",
  },
};

/** Resolve a raw priority string to its display metadata (defaults to Medium). */
export function priorityMeta(p?: string | null): PriorityMeta {
  const v = (p ?? "MEDIUM").toUpperCase() as Priority;
  return PRIORITY_META[v] ?? PRIORITY_META.MEDIUM;
}

/** Sort rank for a to-do's priority (0 = High). */
export function priorityRank(p?: string | null): number {
  return priorityMeta(p).rank;
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "heic", "heif", "ico"];

/** Extension (lowercase, no dot) of a file URL, or "" if none. */
export function fileExt(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

/** Whether a stored attachment URL points at an image (vs a document). */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXTS.includes(fileExt(url));
}

/** Every attachment on a to-do (legacy single + the array), de-duplicated. */
export function milestoneAttachments(m: Pick<Milestone, "imageUrl" | "imageUrls">): string[] {
  const all = [m.imageUrl, ...(m.imageUrls ?? [])].filter((u): u is string => !!u);
  return Array.from(new Set(all));
}

/** Image attachments only. */
export function milestoneImages(m: Pick<Milestone, "imageUrl" | "imageUrls">): string[] {
  return milestoneAttachments(m).filter(isImageUrl);
}

/** Document (non-image) attachments only. */
export function milestoneDocs(m: Pick<Milestone, "imageUrl" | "imageUrls">): string[] {
  return milestoneAttachments(m).filter((u) => !isImageUrl(u));
}

/** Equal-weight progress across a task's milestones. */
export function milestoneProgress(
  ms?: { isDone: boolean }[] | null
): { total: number; done: number; percent: number } {
  const total = ms?.length ?? 0;
  const done = ms?.filter((m) => m.isDone).length ?? 0;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}
