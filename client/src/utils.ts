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

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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
}

/**
 * Revenue rollup for invoice dashboards.
 *  - paid       = invoices marked PAID
 *  - pending    = OUTSTANDING, i.e. everything not paid (PENDING, OVERDUE, …)
 *  - revenue    = paid + pending = sum of every invoice (always reconciles)
 * Treating "outstanding" as "not paid" keeps OVERDUE-status invoices in the
 * totals and matches the server's EraSphere analytics.
 */
export function computeInvoiceRevenue(invoices: RevenueInvoice[]): {
  totalPaid: number;
  totalPending: number;
  totalRevenue: number;
} {
  const totalPaid = invoices
    .filter((i) => (i.status ?? "").toUpperCase() === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoices
    .filter((i) => (i.status ?? "").toUpperCase() !== "PAID")
    .reduce((sum, i) => sum + i.amount, 0);
  return { totalPaid, totalPending, totalRevenue: totalPaid + totalPending };
}