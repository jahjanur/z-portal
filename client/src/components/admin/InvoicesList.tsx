import { useState } from "react";
import Pagination from "../ui/Pagination";
import toast from "react-hot-toast";
import { generateInvoicePdf } from "../../utils/pdfHelpers";
import type { Invoice as AdminInvoice } from "../../contexts/AdminContext";
import { getFileUrl } from "../../api";

interface Invoice extends AdminInvoice {}

interface InvoicesListProps {
  invoices: Invoice[];
  onDelete: (id: number) => void;
  onEdit?: (invoice: Invoice) => void;
  onRequestPayment?: (invoice: Invoice) => void;
  colors: { primary: string };
}

const InvoicesList: React.FC<InvoicesListProps> = ({
  invoices,
  onDelete,
  onEdit,
  onRequestPayment,
  colors: _colors,
}) => {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const paginatedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      <div className="rounded-2xl card-panel py-12 text-center shadow-lg">
        <svg className="mx-auto mb-4 h-16 w-16 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium text-[var(--color-text-secondary)]">No invoices yet</p>
        <p className="text-sm text-[var(--color-text-muted)]">Create your first invoice above</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {paginatedInvoices.map((inv) => {
        const overdue = isOverdue(inv.dueDate, inv.status);
        
        return (
          <div
            key={inv.id}
            className="rounded-xl card-panel p-4 shadow-lg transition hover:-translate-y-[1px] card-panel-hover sm:p-5 overflow-visible"
          >
            <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between overflow-visible">
              {/* Invoice Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h4 className="text-lg font-bold text-[var(--color-text-primary)] break-words">
                    Invoice #{inv.invoiceNumber}
                  </h4>
                  <span
                    className={`whitespace-nowrap px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
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

                  {(inv.issueDate || inv.createdAt) && (
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Issue: {formatDate(inv.issueDate || inv.createdAt)}</span>
                    </div>
                  )}

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

                {inv.lineItems && inv.lineItems.length > 0 && (inv.subtotal != null || inv.taxAmount != null) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                    {inv.subtotal != null && <span>Subtotal: ${inv.subtotal.toFixed(2)}</span>}
                    {inv.taxRate != null && inv.taxRate > 0 && <span>Tax ({inv.taxRate}%): ${(inv.taxAmount ?? 0).toFixed(2)}</span>}
                    <span className="font-medium text-[var(--color-text-secondary)]">Total: ${inv.amount.toFixed(2)}</span>
                  </div>
                )}

                {inv.client && (inv.client.email || (inv.client as { phoneNumber?: string }).phoneNumber) && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {inv.client.email && (
                      <>
                        <svg className="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {inv.client.email}
                      </>
                    )}
                    {(inv.client as { phoneNumber?: string }).phoneNumber && (
                      <span className={inv.client.email ? " ml-3" : ""}>
                        <svg className="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {(inv.client as { phoneNumber?: string }).phoneNumber}
                      </span>
                    )}
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
              <div className="relative z-10 flex flex-wrap gap-2 justify-start sm:justify-end shrink-0 isolate">
                <button
                  type="button"
                  onClick={() => setDetailInvoice(inv)}
                  className="btn-secondary h-9 px-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                {inv.paymentLink && (
                  <a
                    href={inv.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary h-9 px-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg whitespace-nowrap"
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
                    href={getFileUrl(inv.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary h-9 px-3 text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View PDF
                  </a>
                )}
                <button
                  type="button"
                  disabled={downloadingId === inv.id}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDownloadingId(inv.id);
                    try {
                      await generateInvoicePdf(inv, { filename: `Invoice_${inv.invoiceNumber}.pdf` });
                      toast.success("PDF downloaded");
                    } catch (err) {
                      console.error("PDF generation failed:", err);
                      toast.error("Could not generate PDF");
                    } finally {
                      setDownloadingId(null);
                    }
                  }}
                  className="btn-secondary h-9 px-3 text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer relative"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingId === inv.id ? "Generating…" : "Download PDF"}
                </button>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(inv)}
                    className="btn-secondary h-9 px-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}

                {inv.status.toUpperCase() === "PENDING" && onRequestPayment && (
                  <button
                    onClick={() => onRequestPayment(inv)}
                    className="btn-secondary h-9 px-3 text-sm font-semibold rounded-lg whitespace-nowrap"
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
                  className="h-9 px-3 text-sm font-semibold rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] transition hover:opacity-90 whitespace-nowrap"
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
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Invoice detail modal */}
      {detailInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailInvoice(null)}
        >
          <div
            className="rounded-2xl card-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <h3 className="text-lg font-bold text-theme-primary">Invoice #{detailInvoice.invoiceNumber}</h3>
              <button
                type="button"
                onClick={() => setDetailInvoice(null)}
                className="rounded-lg p-2 text-theme-muted hover:bg-[var(--color-surface-2)] hover:text-theme-primary"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-theme-muted">Client</span>
                  <p className="font-medium">{detailInvoice.client?.name || `Client #${detailInvoice.clientId}`}</p>
                  {detailInvoice.client?.company && <p className="text-theme-muted text-xs">{detailInvoice.client.company}</p>}
                </div>
                <div>
                  <span className="text-theme-muted">Status</span>
                  <p className="font-medium">{detailInvoice.status}</p>
                </div>
                <div>
                  <span className="text-theme-muted">Issue date</span>
                  <p className="font-medium">{formatDate(detailInvoice.issueDate || detailInvoice.createdAt)}</p>
                </div>
                <div>
                  <span className="text-theme-muted">Due date</span>
                  <p className="font-medium">{formatDate(detailInvoice.dueDate)}</p>
                </div>
              </div>
              {detailInvoice.client && (
                <div className="text-sm">
                  <span className="text-theme-muted">Contact</span>
                  <p className="font-medium">{detailInvoice.client.email}</p>
                  {(detailInvoice.client as { phoneNumber?: string }).phoneNumber && (
                    <p className="text-theme-muted">{(detailInvoice.client as { phoneNumber?: string }).phoneNumber}</p>
                  )}
                  {(detailInvoice.client as { postalAddress?: string }).postalAddress && (
                    <p className="text-theme-muted text-xs mt-1">{(detailInvoice.client as { postalAddress?: string }).postalAddress}</p>
                  )}
                </div>
              )}
              {detailInvoice.lineItems && detailInvoice.lineItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                          <th className="p-2 text-left font-semibold">Item</th>
                          <th className="w-20 p-2 text-right font-semibold">Qty</th>
                          <th className="w-24 p-2 text-right font-semibold">Unit Price</th>
                          <th className="w-24 p-2 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailInvoice.lineItems.map((li, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)]">
                            <td className="p-2">
                              <span className="font-medium">{li.name}</span>
                              {li.description && <p className="text-xs text-theme-muted">{li.description}</p>}
                            </td>
                            <td className="p-2 text-right">{li.quantity}</td>
                            <td className="p-2 text-right">${(li.unitPrice ?? 0).toFixed(2)}</td>
                            <td className="p-2 text-right">${((li.quantity ?? 0) * (li.unitPrice ?? 0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col items-end gap-1 rounded-lg bg-[var(--color-surface-2)] p-4">
                    {detailInvoice.subtotal != null && (
                      <div className="flex w-48 justify-between text-sm">
                        <span className="text-theme-muted">Subtotal</span>
                        <span>${detailInvoice.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {detailInvoice.taxRate != null && detailInvoice.taxRate > 0 && (
                      <div className="flex w-48 justify-between text-sm">
                        <span className="text-theme-muted">Tax ({detailInvoice.taxRate}%)</span>
                        <span>${(detailInvoice.taxAmount ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex w-48 justify-between border-t border-[var(--color-border)] pt-2 font-bold">
                      <span>Total</span>
                      <span>${detailInvoice.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between rounded-lg bg-[var(--color-surface-2)] p-4">
                  <span className="text-theme-muted">{detailInvoice.description || "Invoice amount"}</span>
                  <span className="font-bold">${detailInvoice.amount.toFixed(2)}</span>
                </div>
              )}
              {detailInvoice.paymentTerms && (
                <div className="text-sm">
                  <span className="text-theme-muted">Payment terms</span>
                  <p className="mt-1 whitespace-pre-wrap">{detailInvoice.paymentTerms}</p>
                </div>
              )}
              {detailInvoice.notes && (
                <div className="text-sm">
                  <span className="text-theme-muted">Notes</span>
                  <p className="mt-1 whitespace-pre-wrap">{detailInvoice.notes}</p>
                </div>
              )}
              {detailInvoice.paymentLink && (
                <a
                  href={detailInvoice.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Pay Now
                </a>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                  onClick={async () => {
                    if (!detailInvoice) return;
                    try {
                      await generateInvoicePdf(detailInvoice, { filename: `Invoice_${detailInvoice.invoiceNumber}.pdf` });
                      toast.success("PDF downloaded");
                    } catch (err) {
                      toast.error("Could not generate PDF");
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;