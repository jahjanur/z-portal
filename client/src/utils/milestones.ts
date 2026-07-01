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
  createdById: number;
  order: number;
  createdAt: string;
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
