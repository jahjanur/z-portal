import React from "react";
import StatusBadge from "../ui/StatusBadge";
import ProgressBar from "../ui/ProgressBar";
import { formatMoney } from "../../utils/currency";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency?: string | null;
  dueDate?: string | null;
  status?: string | null;
  description?: string | null;
  paidAt?: string | null;
  amountPaid?: number;
  remaining?: number;
}

interface InvoiceCardProps {
  invoice: Invoice;
  /** Legacy prop — statuses now render via StatusBadge; kept for API compatibility */
  getStatusColor: (status?: string | null) => string;
  /** Legacy prop — each invoice now formats in its own currency; kept for API compatibility */
  formatCurrency?: (amount: number) => string;
  formatDate: (date?: string | null) => string;
  getDaysUntilDue: (date?: string | null) => number | null;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  formatDate,
  getDaysUntilDue,
}) => {
  const daysUntil = getDaysUntilDue(invoice.dueDate);
  const isOverdue =
    daysUntil !== null && daysUntil < 0 && invoice.status?.toUpperCase() !== "PAID";
  const money = (n: number) => formatMoney(n, invoice.currency);

  return (
    <div className="card-panel card-panel-hover p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              Invoice #{invoice.invoiceNumber}
            </h3>
            {/* Show an explicit "Overdue" label (red) for past-due invoices —
                a raw status of "Pending" tinted red is confusing. A stored
                OVERDUE status also renders correctly via this fallback. */}
            <StatusBadge status={isOverdue ? "OVERDUE" : invoice.status} />
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
          {money(invoice.amount)}
        </p>
      </div>

      {/* Payment progress — shown when a partial payment has been recorded */}
      {(() => {
        const paid = invoice.amountPaid ?? 0;
        const total = invoice.amount || 0;
        const remaining = invoice.remaining ?? Math.max(0, total - paid);
        const isPaid = invoice.status?.toUpperCase() === "PAID" || remaining <= 0;
        if (paid <= 0 && !isPaid) return null; // nothing paid yet → just the amount above
        const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
        return (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <ProgressBar percent={isPaid ? 100 : pct} size="sm" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-[var(--color-success-text)]">
                {money(isPaid ? total : paid)} paid
              </span>
              {isPaid ? (
                <span className="font-semibold text-[var(--color-success-text)]">Fully paid</span>
              ) : (
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {money(remaining)} left
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvoiceCard;
