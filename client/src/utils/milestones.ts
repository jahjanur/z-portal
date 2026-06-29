export interface Milestone {
  id: number;
  taskId: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  isDone: boolean;
  doneAt?: string | null;
  doneBy?: number | null;
  createdById: number;
  order: number;
  createdAt: string;
}

/** All images for a to-do (legacy single + the new array), de-duplicated. */
export function milestoneImages(m: Pick<Milestone, "imageUrl" | "imageUrls">): string[] {
  const all = [m.imageUrl, ...(m.imageUrls ?? [])].filter((u): u is string => !!u);
  return Array.from(new Set(all));
}

/** Equal-weight progress across a task's milestones. */
export function milestoneProgress(
  ms?: { isDone: boolean }[] | null
): { total: number; done: number; percent: number } {
  const total = ms?.length ?? 0;
  const done = ms?.filter((m) => m.isDone).length ?? 0;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}
