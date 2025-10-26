import React from "react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
}

interface RecentInvoiceCardProps {
  invoice: Invoice;
  getStatusColor: (status?: string | null) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string | null) => string;
  primaryColor: string;
}

const RecentInvoiceCard: React.FC<RecentInvoiceCardProps> = ({
  invoice,
  getStatusColor,
  formatCurrency,
  formatDate,
  primaryColor,
}) => {
  return (
    <div className="p-4 transition-all border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            #{invoice.invoiceNumber}
          </h4>
          <p className="text-sm text-gray-500">Due: {formatDate(invoice.dueDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: primaryColor }}>
            {formatCurrency(invoice.amount)}
          </p>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
              invoice.status
            )}`}
          >
            {invoice.status || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecentInvoiceCard;