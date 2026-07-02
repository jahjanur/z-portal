// utils.ts - Shared utility functions
import { isAmountsHidden, maskedAmount } from "./utils/currency";

export const getStatusColor = (status?: string | null) => {
  const base = "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border-hover)]";
  if (!status) return base;
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "PAID":
      return base;
    case "IN_PROGRESS":
    case "PENDING":
      return base;
    default:
      return base;
  }
};

export const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? "Invalid Date"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

// --- Display currency + conversion (populated from GET /settings/currency on
//     app load). Aggregate/dashboard money uses the display currency; each
//     individual invoice is still shown in its own currency elsewhere. ---
type CurrencySettings = { displayCurrency: string; usdPerEur: number; usdPerCad: number };
let _cur: CurrencySettings = { displayCurrency: "USD", usdPerEur: 1.08, usdPerCad: 0.73 };

export function setCurrencySettings(s: Partial<CurrencySettings>) {
  _cur = { ..._cur, ...s };
}
export function getDisplayCurrency() {
  return _cur.displayCurrency;
}
function usdPer(c?: string | null): number {
  return c === "EUR" ? _cur.usdPerEur : c === "CAD" ? _cur.usdPerCad : 1;
}
/** Convert an amount from its currency into the current display currency. */
export function toDisplay(amount: number, from?: string | null): number {
  const to = _cur.displayCurrency;
  if ((from || "USD") === to) return amount;
  return (amount * usdPer(from)) / usdPer(to);
}

export const formatCurrency = (amount: number, currency?: string) => {
  const cur = currency || _cur.displayCurrency;
  if (isAmountsHidden()) return maskedAmount(cur);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount ?? 0);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${cur}`;
  }
};

export const getDaysUntilDue = (dueDate?: string | null) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
};

/**
 * Relative "time ago" label for timestamps (notifications, activity feeds).
 * Falls back to an absolute date past 30 days. Returns "" for an invalid date
 * and "just now" for a future timestamp.
 */
export const timeAgo = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/**
 * Whether an invoice is overdue: unpaid AND either explicitly marked OVERDUE
 * (admins can set that status) or past its due date. Used for the "overdue"
 * alerts/badges so an admin-flagged overdue invoice is never missed.
 */
export function isInvoiceOverdue(invoice: { status?: string | null; dueDate?: string | null }): boolean {
  const status = (invoice.status ?? "").toUpperCase();
  if (status === "PAID") return false;
  if (status === "OVERDUE") return true;
  return !!invoice.dueDate && new Date(invoice.dueDate) < new Date();
}

interface RevenueInvoice {
  status?: string | null;
  amount: number;
  amountPaid?: number | null;
  remaining?: number | null;
  currency?: string | null;
}

/** How much of a single invoice is actually paid (partial payments aware). */
export function invoicePaid(i: RevenueInvoice): number {
  if (typeof i.amountPaid === "number") return i.amountPaid;
  return (i.status ?? "").toUpperCase() === "PAID" ? i.amount : 0; // fallback for old data
}

/** How much of a single invoice is still owed. */
export function invoiceRemaining(i: RevenueInvoice): number {
  if (typeof i.remaining === "number") return i.remaining;
  return Math.max(0, i.amount - invoicePaid(i));
}

/**
 * Revenue rollup for invoice dashboards — partial-payment aware.
 *  - paid       = sum of amounts actually paid (incl. partial payments)
 *  - pending    = OUTSTANDING, i.e. what's still owed across all invoices
 *  - revenue    = paid + pending = sum of every invoice (always reconciles)
 */
export function computeInvoiceRevenue(invoices: RevenueInvoice[]): {
  totalPaid: number;
  totalPending: number;
  totalRevenue: number;
} {
  // Convert each invoice from its own currency into the display currency so
  // totals across mixed-currency invoices reconcile in one number.
  const totalPaid = invoices.reduce((sum, i) => sum + toDisplay(invoicePaid(i), i.currency), 0);
  const totalPending = invoices.reduce((sum, i) => sum + toDisplay(invoiceRemaining(i), i.currency), 0);
  return { totalPaid, totalPending, totalRevenue: totalPaid + totalPending };
}

/* ------------------------------ Revenue trend ----------------------------- */

export interface TrendInvoice {
  amount: number;
  currency?: string | null;
  status?: string | null;
  createdAt: string;
  issueDate?: string | null;
  dueDate?: string | null;
  payments?: { amount: number; paidAt: string }[];
}

export interface TrendPoint {
  period: string;
  paid: number;
  pending: number;
  total: number;
}

/**
 * Revenue over time — partial-payment & currency aware.
 *  - PAID is bucketed by each payment's own date (so a payment made 2 months
 *    ago shows in that month, not on the invoice's date).
 *  - PENDING (still outstanding) is bucketed on the invoice's issue date.
 *  - Every amount is converted into the display currency.
 * Periods are seeded continuously so the axis has no gaps.
 */
export function computeRevenueTrend(invoices: TrendInvoice[], range: "week" | "month" | "year"): TrendPoint[] {
  const now = new Date();
  type Bucket = { label: string; start: number; end: number; paid: number; pending: number };
  const buckets: Bucket[] = [];

  if (range === "week") {
    // last 8 rolling 7-day windows
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      buckets.push({ label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start: start.getTime(), end: end.getTime(), paid: 0, pending: 0 });
    }
  } else {
    const n = range === "month" ? 6 : 12;
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1, 0, 0, 0, -1);
      buckets.push({
        label: start.toLocaleDateString("en-US", { month: "short", year: range === "year" ? "2-digit" : undefined }),
        start: start.getTime(),
        end: end.getTime(),
        paid: 0,
        pending: 0,
      });
    }
  }

  // Drop an amount into the bucket containing `time` (used for paid, which is a
  // flow event on a real date; out-of-range payments are simply not shown).
  const add = (time: number, key: "paid" | "pending", amt: number) => {
    if (!Number.isFinite(time) || amt <= 0) return;
    const b = buckets.find((b) => time >= b.start && time <= b.end);
    if (b) b[key] += amt;
  };
  // Like `add`, but clamps into the range — used for pending, which is a
  // still-owed balance that must remain visible (in the current/most-recent
  // period, or its future due month) rather than vanish after the issue month.
  const addClamped = (time: number, key: "paid" | "pending", amt: number) => {
    if (amt <= 0 || !buckets.length) return;
    let b = buckets.find((b) => time >= b.start && time <= b.end);
    if (!b) b = time < buckets[0].start ? buckets[0] : buckets[buckets.length - 1];
    b[key] += amt;
  };

  const nowMs = now.getTime();
  for (const inv of invoices) {
    const cur = inv.currency;
    const payments = inv.payments ?? [];
    if (payments.length > 0) {
      for (const p of payments) add(new Date(p.paidAt).getTime(), "paid", toDisplay(p.amount, cur));
    } else if ((inv.status ?? "").toUpperCase() === "PAID") {
      add(new Date(inv.issueDate || inv.createdAt).getTime(), "paid", toDisplay(inv.amount, cur));
    }
    const paidSum = payments.length > 0
      ? payments.reduce((s, p) => s + p.amount, 0)
      : ((inv.status ?? "").toUpperCase() === "PAID" ? inv.amount : 0);
    const remaining = Math.max(0, inv.amount - paidSum);
    // Outstanding stays pending until paid: show it at its due date if that's
    // still upcoming, otherwise in the current period (never a past month).
    if (remaining > 0) {
      const due = new Date(inv.dueDate || inv.issueDate || inv.createdAt).getTime();
      const target = Number.isFinite(due) && due > nowMs ? due : nowMs;
      addClamped(target, "pending", toDisplay(remaining, cur));
    }
  }

  const r = (n: number) => Math.round(n * 100) / 100;
  return buckets.map((b) => ({ period: b.label, paid: r(b.paid), pending: r(b.pending), total: r(b.paid + b.pending) }));
}