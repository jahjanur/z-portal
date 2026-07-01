// Currency helpers. USD is the pivot; rates say how many USD one unit of a
// currency is worth (usdPerEur, usdPerCad; USD is always 1).

export const CURRENCIES = ["USD", "EUR", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Rates {
  usdPerEur: number;
  usdPerCad: number;
}

export function isCurrency(c: unknown): c is Currency {
  return typeof c === "string" && (CURRENCIES as readonly string[]).includes(c);
}

/** USD value of one unit of the given currency. */
export function usdPer(currency: string, rates: Rates): number {
  if (currency === "EUR") return rates.usdPerEur;
  if (currency === "CAD") return rates.usdPerCad;
  return 1; // USD
}

/** Convert an amount from one currency to another via the USD pivot. */
export function convert(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const inUsd = amount * usdPer(from, rates);
  return inUsd / usdPer(to, rates);
}
