import React from "react";
import StatusBadge from "../ui/StatusBadge";
import { isInvoiceOverdue } from "../../utils";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
}

interface RecentInvoiceCardProps {
  invoice: Invoice;
  /** Legacy prop — statuses now render via StatusBadge; kept for API compatibility */
  getStatusColor: (status?: string | null) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string | null) => string;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const RecentInvoiceCard: React.FC<RecentInvoiceCardProps> = ({
  invoice,
  formatCurrency,
  formatDate,
}) => {
  return (
    <div className="card-panel card-panel-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            #{invoice.invoiceNumber}
          </h4>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            Due: {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
            {formatCurrency(invoice.amount)}
          </p>
          <StatusBadge status={isInvoiceOverdue(invoice) ? "OVERDUE" : invoice.status} />
        </div>
      </div>
    </div>
  );
};

export default RecentInvoiceCard;
