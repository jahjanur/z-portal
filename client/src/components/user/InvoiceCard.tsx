import React from "react";

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
  getStatusColor: (status?: string | null) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string | null) => string;
  getDaysUntilDue: (date?: string | null) => number | null;
  primaryColor: string;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  getStatusColor,
  formatCurrency,
  formatDate,
  getDaysUntilDue,
  primaryColor,
}) => {
  const daysUntil = getDaysUntilDue(invoice.dueDate);
  const isOverdue =
    daysUntil !== null && daysUntil < 0 && invoice.status?.toUpperCase() !== "PAID";

  return (
    <div className="p-6 transition-all bg-white border border-gray-200 shadow-sm rounded-2xl hover:shadow-md hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h3>
            <span
              className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${getStatusColor(
                invoice.status
              )}`}
            >
              {invoice.status || "N/A"}
            </span>
          </div>
          {invoice.description && (
            <p className="mb-3 text-sm text-gray-600">{invoice.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {invoice.dueDate && (
              <span
                className={`flex items-center gap-2 ${
                  isOverdue ? "text-red-600 font-semibold" : ""
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="flex items-center gap-2 font-semibold text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Paid: {formatDate(invoice.paidAt)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="mb-2 text-3xl font-bold" style={{ color: primaryColor }}>
            {formatCurrency(invoice.amount)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;