/**
 * Lightweight UI sounds via the Web Audio API (no audio files needed).
 * Played on events like a new notification / task. Respects a mute preference
 * and debounces so multiple hook instances don't double-trigger.
 */
let ctx: AudioContext | null = null;
let lastPlayed = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, peak: number, type: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const t0 = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem("soundEnabled") !== "false"; } catch { return true; }
}
export function setSoundEnabled(v: boolean): void {
  try { localStorage.setItem("soundEnabled", v ? "true" : "false"); } catch { /* ignore */ }
}

function guard(): boolean {
  if (!isSoundEnabled()) return false;
  const now = Date.now();
  if (now - lastPlayed < 1200) return false; // debounce duplicate triggers
  lastPlayed = now;
  return true;
}

/** Soft two-note chime — generic "you got a notification". */
export function playNotificationSound(): void {
  if (!guard()) return;
  try { tone(660, 0, 0.16, 0.10); tone(880, 0.085, 0.22, 0.085); } catch { /* ignore */ }
}

/** Brighter rising arpeggio — for completions / approvals (success). */
export function playSuccessSound(): void {
  if (!guard()) return;
  try { tone(523.25, 0, 0.13, 0.09); tone(659.25, 0.1, 0.13, 0.09); tone(783.99, 0.2, 0.26, 0.11); } catch { /* ignore */ }
}

/** Play the right sound for a notification type. */
export function playForNotificationType(type?: string): void {
  const t = (type || "").toUpperCase();
  if (t.includes("COMPLET") || t.includes("APPROV") || t.includes("PAID")) playSuccessSound();
  else playNotificationSound();
}
