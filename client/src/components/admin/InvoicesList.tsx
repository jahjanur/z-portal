import { useState } from "react";
import Pagination from "../ui/Pagination";
import toast from "react-hot-toast";
import { generateInvoicePdf } from "../../utils/pdfHelpers";
import type { Invoice as AdminInvoice } from "../../contexts/AdminContext";
import { getFileUrl } from "../../api";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

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
      <EmptyState
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No invoices yet"
        description="Create your first invoice above"
      />
    );
  }

  return (
    <div className="space-y-3 min-w-0 max-w-full stagger-children">
      {paginatedInvoices.map((inv) => {
        const overdue = isOverdue(inv.dueDate, inv.status);

        return (
          <div key={inv.id} className="card-panel row-hover rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {/* Invoice info: number + client stacked left */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-base font-bold text-[var(--color-text-primary)] break-words sm:text-lg">
                    Invoice #{inv.invoiceNumber}
                  </h4>
                  <StatusBadge status={overdue ? "OVERDUE" : inv.status} />
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                  {inv.client?.name || `Client #${inv.clientId}`}
                  {inv.client?.email && <span className="ml-2">{inv.client.email}</span>}
                </p>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    ${inv.amount.toFixed(2)}
                  </span>
                  {(inv.issueDate || inv.createdAt) && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Issued {formatDate(inv.issueDate || inv.createdAt)}
                    </span>
                  )}
                  <span className={`text-xs ${overdue ? "font-semibold text-[var(--color-destructive-text)]" : "text-[var(--color-text-muted)]"}`}>
                    Due {formatDate(inv.dueDate)}
                  </span>
                  {inv.paidAt && (
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Paid {formatDate(inv.paidAt)}
                    </span>
                  )}
                </div>

                {inv.lineItems && inv.lineItems.length > 0 && (inv.subtotal != null || inv.taxAmount != null) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                    {inv.subtotal != null && <span>Subtotal: ${inv.subtotal.toFixed(2)}</span>}
                    {inv.taxRate != null && inv.taxRate > 0 && <span>Tax ({inv.taxRate}%): ${(inv.taxAmount ?? 0).toFixed(2)}</span>}
                    <span className="font-medium text-[var(--color-text-secondary)]">Total: ${inv.amount.toFixed(2)}</span>
                  </div>
                )}

                {(inv.client as { phoneNumber?: string } | undefined)?.phoneNumber && (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                    {(inv.client as { phoneNumber?: string }).phoneNumber}
                  </p>
                )}

                {inv.paymentLink && (
                  <a
                    href={inv.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Payment Link Available
                  </a>
                )}
              </div>

              {/* Actions: stack full-width on mobile */}
              <div className="flex flex-col gap-2 shrink-0 sm:flex-row sm:flex-wrap lg:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDetailInvoice(inv)}
                  className="flex-1 sm:flex-none"
                >
                  View
                </Button>

                {inv.paymentLink && (
                  <a
                    href={inv.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary h-9 px-3 text-xs flex-1 sm:flex-none inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold"
                  >
                    Pay Now
                  </a>
                )}

                {inv.fileUrl && (
                  <a
                    href={getFileUrl(inv.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary h-9 px-3 text-xs flex-1 sm:flex-none inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold"
                  >
                    View PDF
                  </a>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  loading={downloadingId === inv.id}
                  className="flex-1 sm:flex-none"
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
                >
                  {downloadingId === inv.id ? "Generating…" : "Download"}
                </Button>

                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={() => onEdit(inv)} className="flex-1 sm:flex-none">
                    Edit
                  </Button>
                )}

                {inv.status.toUpperCase() === "PENDING" && onRequestPayment && (
                  <Button variant="secondary" size="sm" onClick={() => onRequestPayment(inv)} className="flex-1 sm:flex-none">
                    Request Payment
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    if (confirm(`Delete invoice #${inv.invoiceNumber}?`)) {
                      onDelete(inv.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Invoice detail modal */}
      <Modal
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        title={detailInvoice ? `Invoice #${detailInvoice.invoiceNumber}` : undefined}
        maxWidth="2xl"
      >
        {detailInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[var(--color-text-muted)]">Client</span>
                <p className="font-medium text-[var(--color-text-primary)]">{detailInvoice.client?.name || `Client #${detailInvoice.clientId}`}</p>
                {detailInvoice.client?.company && <p className="text-xs text-[var(--color-text-muted)]">{detailInvoice.client.company}</p>}
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Status</span>
                <p className="mt-0.5"><StatusBadge status={detailInvoice.status} /></p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Issue date</span>
                <p className="font-medium text-[var(--color-text-primary)]">{formatDate(detailInvoice.issueDate || detailInvoice.createdAt)}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Due date</span>
                <p className="font-medium text-[var(--color-text-primary)]">{formatDate(detailInvoice.dueDate)}</p>
              </div>
            </div>
            {detailInvoice.client && (
              <div className="text-sm">
                <span className="text-[var(--color-text-muted)]">Contact</span>
                <p className="font-medium text-[var(--color-text-primary)]">{detailInvoice.client.email}</p>
                {(detailInvoice.client as { phoneNumber?: string }).phoneNumber && (
                  <p className="text-[var(--color-text-muted)]">{(detailInvoice.client as { phoneNumber?: string }).phoneNumber}</p>
                )}
                {(detailInvoice.client as { postalAddress?: string }).postalAddress && (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{(detailInvoice.client as { postalAddress?: string }).postalAddress}</p>
                )}
              </div>
            )}
            {detailInvoice.lineItems && detailInvoice.lineItems.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="w-20 text-right">Qty</th>
                        <th className="w-24 text-right">Unit Price</th>
                        <th className="w-24 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailInvoice.lineItems.map((li, i) => (
                        <tr key={i}>
                          <td>
                            <span className="font-medium text-[var(--color-text-primary)]">{li.name}</span>
                            {li.description && <p className="text-xs text-[var(--color-text-muted)]">{li.description}</p>}
                          </td>
                          <td className="text-right tabular-nums">{li.quantity}</td>
                          <td className="text-right tabular-nums">${(li.unitPrice ?? 0).toFixed(2)}</td>
                          <td className="text-right tabular-nums">${((li.quantity ?? 0) * (li.unitPrice ?? 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-panel flex flex-col items-end gap-1 rounded-xl p-4">
                  {detailInvoice.subtotal != null && (
                    <div className="flex w-48 justify-between text-sm tabular-nums">
                      <span className="text-[var(--color-text-muted)]">Subtotal</span>
                      <span>${detailInvoice.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {detailInvoice.taxRate != null && detailInvoice.taxRate > 0 && (
                    <div className="flex w-48 justify-between text-sm tabular-nums">
                      <span className="text-[var(--color-text-muted)]">Tax ({detailInvoice.taxRate}%)</span>
                      <span>${(detailInvoice.taxAmount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex w-48 justify-between border-t border-[var(--color-border)] pt-2 font-bold tabular-nums text-[var(--color-text-primary)]">
                    <span>Total</span>
                    <span>${detailInvoice.amount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="card-panel flex justify-between rounded-xl p-4">
                <span className="text-[var(--color-text-muted)]">{detailInvoice.description || "Invoice amount"}</span>
                <span className="font-bold tabular-nums text-[var(--color-text-primary)]">${detailInvoice.amount.toFixed(2)}</span>
              </div>
            )}
            {detailInvoice.paymentTerms && (
              <div className="text-sm">
                <span className="text-[var(--color-text-muted)]">Payment terms</span>
                <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-secondary)]">{detailInvoice.paymentTerms}</p>
              </div>
            )}
            {detailInvoice.notes && (
              <div className="text-sm">
                <span className="text-[var(--color-text-muted)]">Notes</span>
                <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-secondary)]">{detailInvoice.notes}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              {detailInvoice.paymentLink && (
                <a
                  href={detailInvoice.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary h-9 px-3 text-xs inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap font-semibold sm:flex-none"
                >
                  Pay Now
                </a>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
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
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesList;
