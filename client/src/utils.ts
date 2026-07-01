// utils.ts - Shared utility functions

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