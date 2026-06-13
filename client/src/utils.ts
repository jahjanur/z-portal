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