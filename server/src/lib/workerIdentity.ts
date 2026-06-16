/**
 * Worker privacy: external audiences (CLIENT, ERASPHERE) never see a worker's
 * real name/email — only a stable, premium codename + emoji ("🎨 Cobalt Pixel").
 *
 * Handles are derived deterministically from the worker's immutable id (FNV-1a
 * hash), so they stay consistent across every request with no storage. A role
 * "pool" (emoji + nouns) is also picked from the id — clients can't tell a
 * worker's real discipline, so the theming is purely cosmetic to them and the
 * variety just makes the handles feel human.
 */

// Jewel-toned adjectives shared across all pools.
const ADJECTIVES = [
  "Cobalt", "Crimson", "Amber", "Onyx", "Quartz", "Velvet", "Lunar", "Nova",
  "Ember", "Slate", "Indigo", "Saffron", "Cedar", "Frost", "Solar", "Ivory",
  "Cyan", "Garnet", "Obsidian", "Aurum", "Sable", "Halcyon", "Verdant", "Marble",
];

// emoji + noun pools (one per discipline). Index chosen from the id hash.
const ROLE_POOLS: { emoji: string; nouns: string[] }[] = [
  { emoji: "🎨", nouns: ["Pixel", "Canvas", "Palette", "Vector", "Pigment", "Inkwell", "Aura", "Stencil", "Muse", "Tint"] },
  { emoji: "💠", nouns: ["Layout", "Frame", "Viewport", "Render", "Prism", "Facet", "Glaze", "Bevel", "Ripple", "Marquee"] },
  { emoji: "⚙️", nouns: ["Daemon", "Core", "Kernel", "Engine", "Forge", "Anvil", "Cache", "Cipher", "Vault", "Pylon"] },
  { emoji: "🧩", nouns: ["Nexus", "Bridge", "Loom", "Weaver", "Conduit", "Pivot", "Hinge", "Mesh", "Lattice", "Span"] },
  { emoji: "🧠", nouns: ["Oracle", "Neuron", "Cortex", "Synapse", "Vertex", "Lambda", "Tensor", "Halo", "Quanta", "Echo"] },
  { emoji: "📱", nouns: ["Pocket", "Beacon", "Signal", "Drift", "Pebble", "Tap", "Pulse", "Nomad", "Swift", "Orbit"] },
  { emoji: "🔍", nouns: ["Hawk", "Sentinel", "Sieve", "Probe", "Lens", "Tracer", "Falcon", "Net", "Gauge", "Scout"] },
  { emoji: "🚀", nouns: ["Atlas", "Helm", "Pipeline", "Summit", "Relay", "Pylon", "Beacon", "Comet", "Stack", "Forge"] },
  { emoji: "🎯", nouns: ["Compass", "Pilot", "Anchor", "Vantage", "Captain", "Quill", "Helm", "Tempo", "Vector", "North"] },
];

/** Deterministic 32-bit FNV-1a hash — stable across runs, no crypto needed. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function poolFor(id: number) {
  return ROLE_POOLS[hash32(`${id}`) % ROLE_POOLS.length];
}

/** "Cobalt Pixel" — the worker's codename (adjective + role-themed noun). */
export function workerAlias(id: number): string {
  const h = hash32(`${id}`);
  const adj = ADJECTIVES[(h >>> 4) % ADJECTIVES.length];
  const noun = poolFor(id).nouns[(h >>> 8) % 10];
  return `${adj} ${noun}`;
}

/** The role-themed emoji avatar (🎨 / ⚙️ / 🧠 …). */
export function workerEmoji(id: number): string {
  return poolFor(id).emoji;
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
