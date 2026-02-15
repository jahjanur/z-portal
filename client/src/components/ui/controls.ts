/**
 * Shared control sizing for dashboard forms.
 * Theme-aware via CSS variables (--color-* from theme.css).
 */

/** Height 44px (h-11), rounded-xl, px-4, text-sm. Use for input/select/textarea. */
export const CONTROL_BASE =
  "h-11 min-h-[44px] w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder-[var(--color-placeholder)] focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-0 hover:border-[var(--color-border-hover)]";

/** For <select>: ensure native select matches height (appearance-none + flex items-center). */
export const CONTROL_SELECT = `${CONTROL_BASE} appearance-none`;

/** For <input type="text|email|number|date|url"> */
export const CONTROL_INPUT = CONTROL_BASE;

/** For <textarea>: min-height, resize. */
export const CONTROL_TEXTAREA = `${CONTROL_BASE} min-h-[88px] resize-y`;

/** Form label above controls: consistent margin and font. */
export const CONTROL_LABEL = "mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]";

/** Action button that matches control height (e.g. "New Project", "Add Domain"). */
export const BTN_ACTION =
  "inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-0";

/** Primary submit (same height as controls). */
export const BTN_SUBMIT =
  "inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-0 btn-primary";
