// Supported currencies (matches the server). USD is the conversion pivot.
export const CURRENCIES = ["USD", "EUR", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABEL: Record<Currency, string> = {
  USD: "USD — US Dollar",
  EUR: "EUR — Euro",
  CAD: "CAD — Canadian Dollar",
};

export function isCurrency(c: unknown): c is Currency {
  return typeof c === "string" && (CURRENCIES as readonly string[]).includes(c);
}

// --- Privacy mode: hide exact money amounts (show €•••• instead). Persisted
//     in localStorage; components re-render via the "amountsvisibilitychange"
//     event (see App.tsx). ---
let _hidden = typeof localStorage !== "undefined" && localStorage.getItem("hideAmounts") === "1";
export const AMOUNTS_EVENT = "amountsvisibilitychange";

export function isAmountsHidden(): boolean {
  return _hidden;
}
export function setAmountsHidden(v: boolean): void {
  _hidden = v;
  try { localStorage.setItem("hideAmounts", v ? "1" : "0"); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AMOUNTS_EVENT));
}
/** The masked placeholder shown in privacy mode, e.g. "€****". */
export function maskedAmount(currency?: string | null): string {
  return `${currencySymbol(currency)}****`;
}

/** Format an amount in its currency, e.g. $1,200.00 / €1,200.00 / CA$1,200.00. */
export function formatMoney(amount: number, currency?: string | null): string {
  const cur = isCurrency(currency) ? currency : "USD";
  if (_hidden) return maskedAmount(cur);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount ?? 0);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${cur}`;
  }
}

/** Just the currency symbol, e.g. $, €, CA$. */
export function currencySymbol(currency?: string | null): string {
  const cur = isCurrency(currency) ? currency : "USD";
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? cur;
  } catch {
    return cur;
  }
}
