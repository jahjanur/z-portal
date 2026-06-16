/**
 * Worker privacy: external audiences (CLIENT, ERASPHERE) must never see a
 * worker's real name or email — only a stable, auto-generated codename + emoji
 * avatar. Aliases are derived deterministically from the worker's id, so they
 * stay consistent across requests with no extra storage.
 */

// Creative one-word codenames (kept neutral so they suit designers & devs alike).
const ALIASES = [
  "Nova", "Atlas", "Pixel", "Quartz", "Vega", "Orbit", "Cobalt", "Ember",
  "Sable", "Onyx", "Comet", "Flint", "Zephyr", "Lumen", "Indigo", "Maple",
  "Cedar", "Slate", "Echo", "Drift", "Sol", "Lyra", "Koda", "Wren",
  "Fable", "Pippin", "Juno", "Mica", "Rune", "Tycho", "Halo", "Nimbus",
  "Vesper", "Cyan", "Marlo", "Quill", "Arlo", "Nyx", "Pax", "Birch",
];

// Memoji-style emoji faces/creatures. Different length from ALIASES so the
// name and emoji vary independently (avoids everyone with the same name/emoji).
const EMOJIS = [
  "🦊", "🐼", "🦉", "🐺", "🦁", "🐯", "🐨", "🐵", "🦅", "🐧",
  "🦄", "🐙", "🦋", "🐢", "🐝", "🦓", "🦒", "🐬", "🦈", "🐳",
  "🦚", "🦜", "🐊", "🦦", "🦡", "🐲", "🦕", "🐶", "🐱", "🐭",
  "🐹", "🐰", "🐻", "🐸", "🦔", "🐥", "🦝",
];

export function workerAlias(id: number): string {
  return ALIASES[Math.abs(id) % ALIASES.length];
}

export function workerEmoji(id: number): string {
  return EMOJIS[Math.abs(id) % EMOJIS.length];
}

type EmbeddedUser = { id: number; name?: string | null; email?: string | null; role?: string | null } | null | undefined;

/** Replace a user object with its public alias *only* if it's a worker. */
export function maskWorker<T extends EmbeddedUser>(user: T): T {
  if (!user || user.role !== "WORKER") return user;
  return {
    id: user.id,
    role: "WORKER",
    name: workerAlias(user.id),
    avatarEmoji: workerEmoji(user.id),
  } as unknown as T;
}

/**
 * Mask every worker identity embedded in a task payload (workers, comment
 * authors, file uploaders, file-comment authors). Mutates and returns the task.
 * Call only for external viewers (CLIENT / ERASPHERE).
 */
export function maskTaskWorkers(task: any): any {
  if (!task) return task;
  if (Array.isArray(task.workers)) {
    task.workers = task.workers.map((tw: any) => ({ ...tw, user: maskWorker(tw.user) }));
  }
  if (Array.isArray(task.comments)) {
    task.comments = task.comments.map((c: any) => ({ ...c, user: maskWorker(c.user) }));
  }
  if (Array.isArray(task.files)) {
    task.files = task.files.map((f: any) => ({
      ...f,
      uploader: maskWorker(f.uploader),
      comments: Array.isArray(f.comments) ? f.comments.map((c: any) => ({ ...c, user: maskWorker(c.user) })) : f.comments,
    }));
  }
  return task;
}
