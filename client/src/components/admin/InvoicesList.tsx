interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  clientId: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  fileUrl?: string;
  paymentLink?: string;
  client?: { name: string; email: string };
}

interface InvoicesListProps {
  invoices: Invoice[];
  onDelete: (id: number) => void;
  onRequestPayment?: (invoice: Invoice) => void;
  colors: { primary: string };
}

const InvoicesList: React.FC<InvoicesListProps> = ({ 
  invoices, 
  onDelete, 
  onRequestPayment,
  colors 
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border-hover)]";
      case "PENDING":
        return "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border-hover)]";
      case "OVERDUE":
        return "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border border-[var(--color-destructive-border)]";
      default:
        return "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border-hover)]";
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status.toUpperCase() === "PENDING" && new Date(dueDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl card-panel py-12 text-center shadow-lg backdrop-blur-md">
        <svg className="mx-auto mb-4 h-16 w-16 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium text-[var(--color-text-secondary)]">No invoices yet</p>
        <p className="text-sm text-[var(--color-text-muted)]">Create your first invoice above</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const overdue = isOverdue(inv.dueDate, inv.status);
        
        return (
          <div
            key={inv.id}
            className="rounded-xl card-panel p-5 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Invoice Info */}
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Invoice #{inv.invoiceNumber}
                  </h4>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                      overdue ? "OVERDUE" : inv.status
                    )}`}
                  >
                    {overdue ? "OVERDUE" : inv.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">{inv.client?.name || `Client #${inv.clientId}`}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-[var(--color-text-primary)]">${inv.amount.toFixed(2)}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${overdue ? "font-semibold text-red-600" : "text-[var(--color-text-muted)]"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Due: {formatDate(inv.dueDate)}</span>
                  </div>

                  {inv.paidAt && (
                    <div className="flex items-center gap-2 font-semibold text-[var(--color-text-secondary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Paid: {formatDate(inv.paidAt)}</span>
                    </div>
                  )}
                </div>

                {inv.client?.email && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    <svg className="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {inv.client.email}
                  </p>
                )}

                {inv.paymentLink && (
                  <div className="mt-2">
                    <a
                      href={inv.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Payment Link Available
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {inv.paymentLink && (
                  <a
                    href={inv.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Pay Now
                    </div>
                  </a>
                )}

                {inv.fileUrl && (
                  <a
                    href={`http://localhost:4001${inv.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View PDF
                    </div>
                  </a>
                )}

                {inv.status.toUpperCase() === "PENDING" && onRequestPayment && (
                  <button
                    onClick={() => onRequestPayment(inv)}
                    className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Request Payment
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (confirm(`Delete invoice #${inv.invoiceNumber}?`)) {
                      onDelete(inv.id);
                    }
                  }}
                  className="rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-destructive-text)] transition hover:opacity-90"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvoicesList;