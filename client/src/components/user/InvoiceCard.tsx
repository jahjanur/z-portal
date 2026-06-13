import React from "react";
import StatusBadge from "../ui/StatusBadge";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
  description?: string | null;
  paidAt?: string | null;
}

interface InvoiceCardProps {
  invoice: Invoice;
  /** Legacy prop — statuses now render via StatusBadge; kept for API compatibility */
  getStatusColor: (status?: string | null) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string | null) => string;
  getDaysUntilDue: (date?: string | null) => number | null;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  formatCurrency,
  formatDate,
  getDaysUntilDue,
}) => {
  const daysUntil = getDaysUntilDue(invoice.dueDate);
  const isOverdue =
    daysUntil !== null && daysUntil < 0 && invoice.status?.toUpperCase() !== "PAID";

  return (
    <div className="card-panel card-panel-hover p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              Invoice #{invoice.invoiceNumber}
            </h3>
            <StatusBadge
              status={invoice.status}
              tone={isOverdue ? "danger" : undefined}
            />
          </div>
          {invoice.description && (
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{invoice.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)]">
            {invoice.dueDate && (
              <span
                className={`flex items-center gap-1.5 ${
                  isOverdue ? "font-semibold text-[var(--color-destructive-text)]" : ""
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {isOverdue
                    ? `Overdue by ${Math.abs(daysUntil!)} days`
                    : `Due: ${formatDate(invoice.dueDate)}`}
                </span>
              </span>
            )}
            {invoice.paidAt && (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--color-success-text)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Paid: {formatDate(invoice.paidAt)}</span>
              </span>
            )}
          </div>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)] sm:text-right">
          {formatCurrency(invoice.amount)}
        </p>
      </div>
    </div>
  );
};

export default InvoiceCard;
