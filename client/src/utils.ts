// utils.ts - Shared utility functions

export const getStatusColor = (status?: string | null) => {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "bg-green-100 text-green-700 border-green-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "PAID":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
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