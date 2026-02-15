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