import React from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** Central status → tone mapping for the whole app. */
const STATUS_TONE: Record<string, BadgeTone> = {
  // Tasks
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  // Invoices
  PAID: "success",
  UNPAID: "warning",
  OVERDUE: "danger",
  DRAFT: "neutral",
  SENT: "info",
  // Domains / hosting
  ACTIVE: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
  // Profiles / invites
  COMPLETE: "success",
  INCOMPLETE: "warning",
  ACCEPTED: "success",
  REVOKED: "danger",
  // File review
  APPROVED: "success",
  REJECTED: "danger",
  NEEDS_CHANGES: "warning",
  UNDER_REVIEW: "info",
};

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge",
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  info: "badge badge-info",
};

export function toneForStatus(status?: string | null): BadgeTone {
  if (!status) return "neutral";
  return STATUS_TONE[status.toUpperCase().replace(/[\s-]/g, "_")] ?? "neutral";
}

interface StatusBadgeProps {
  status?: string | null;
  /** Override the automatic tone */
  tone?: BadgeTone;
  /** Custom label; defaults to a prettified status */
  children?: React.ReactNode;
  className?: string;
  /** Show a small dot before the label */
  dot?: boolean;
}

function prettify(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({
  status,
  tone,
  children,
  className = "",
  dot = true,
}: StatusBadgeProps) {
  const resolved = tone ?? toneForStatus(status);
  return (
    <span className={`${TONE_CLASS[resolved]} ${className}`}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {children ?? (status ? prettify(status) : "—")}
    </span>
  );
}
