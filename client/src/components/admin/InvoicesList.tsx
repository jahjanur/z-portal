import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Paperclip, FileText, X, Check, Trash2, Download, Image as ImageIcon } from "lucide-react";
import Pagination from "../ui/Pagination";
import toast from "react-hot-toast";
import { generateInvoicePdf } from "../../utils/pdfHelpers";
import type { Invoice as AdminInvoice } from "../../contexts/AdminContext";
import API, { getFileUrl } from "../../api";
import StatusBadge from "../ui/StatusBadge";
import ProgressBar from "../ui/ProgressBar";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { formatMoney } from "../../utils/currency";
import { useFileDrop } from "../../hooks/useFileDrop";

interface Invoice extends AdminInvoice {}

interface InvoicesListProps {
  invoices: Invoice[];
  onDelete: (id: number) => void;
  onRequestPayment?: (invoice: Invoice) => void;
  /** Refresh the list after an edit / payment is recorded/removed. */
  onChanged?: () => void;
  colors: { primary: string };
}

const fmt = (n: number, currency?: string | null) => formatMoney(n ?? 0, currency);

const InvoicesList: React.FC<InvoicesListProps> = ({
  invoices,
  onDelete,
  onRequestPayment,
  onChanged,
  colors: _colors,
}) => {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  // Edit an existing payment
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [ePayAmount, setEPayAmount] = useState("");
  const [ePayDate, setEPayDate] = useState("");
  const [ePayNote, setEPayNote] = useState("");
  const [ePayReceipt, setEPayReceipt] = useState<File | null>(null);
  const [ePayRemoveReceipt, setEPayRemoveReceipt] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const ePayReceiptRef = useRef<HTMLInputElement>(null);

  // In-app receipt preview (image lightbox / PDF frame) instead of a new tab
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|svg)$/i.test(url.split("?")[0]);
  const isPdfUrl = (url: string) => /\.pdf$/i.test(url.split("?")[0]);

  // Drag & drop for receipts (record form + edit form)
  const { dragging: payDragging, dropHandlers: payDrop } = useFileDrop((files) => setPayReceipt(files[0] ?? null), { multiple: false });
  const { dragging: ePayDragging, dropHandlers: ePayDrop } = useFileDrop((files) => { setEPayReceipt(files[0] ?? null); setEPayRemoveReceipt(false); }, { multiple: false });

  // Inline edit of the invoice's editable fields (right inside the detail view).
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentLink, setEditPaymentLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  /** Open the detail modal; when `edit` is true, start in edit mode. */
  const openDetail = (inv: Invoice, edit = false) => {
    setDetailInvoice(inv);
    setEditStatus(inv.status);
    setEditDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : "");
    setEditPaymentLink(inv.paymentLink ?? "");
    setEditNotes(inv.notes ?? "");
    setEditMode(edit);
  };

  const closeDetail = () => {
    setDetailInvoice(null);
    setEditMode(false);
    setPayAmount(""); setPayDate(""); setPayNote(""); setPayReceipt(null);
    if (receiptRef.current) receiptRef.current.value = "";
  };

  const saveDetails = async () => {
    if (!detailInvoice) return;
    setSavingEdit(true);
    try {
      const { data } = await API.put(`/invoices/${detailInvoice.id}`, {
        status: editStatus,
        dueDate: editDueDate || undefined,
        paymentLink: editPaymentLink,
        notes: editNotes,
      });
      setDetailInvoice(data);
      setEditMode(false);
      toast.success("Invoice updated");
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't update invoice");
    } finally {
      setSavingEdit(false);
    }
  };

  const recordPayment = async () => {
    if (!detailInvoice) return;
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setRecording(true);
    try {
      // multipart when a receipt is attached (Content-Type:undefined lets the
      // browser set the multipart boundary; the API default is JSON).
      const fd = new FormData();
      fd.append("amount", String(amount));
      if (payDate) fd.append("paidAt", payDate);
      if (payNote) fd.append("note", payNote);
      if (payReceipt) fd.append("receipt", payReceipt);
      const { data } = await API.post(`/invoices/${detailInvoice.id}/payments`, fd, { headers: { "Content-Type": undefined } });
      setDetailInvoice(data);
      setPayAmount(""); setPayDate(""); setPayNote(""); setPayReceipt(null);
      if (receiptRef.current) receiptRef.current.value = "";
      toast.success("Payment recorded");
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't record payment");
    } finally {
      setRecording(false);
    }
  };

  const removePayment = async (paymentId: number) => {
    if (!detailInvoice) return;
    try {
      const { data } = await API.delete(`/invoices/${detailInvoice.id}/payments/${paymentId}`);
      setDetailInvoice(data);
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't remove payment");
    }
  };

  const startEditPayment = (p: { id: number; amount: number; paidAt: string; note?: string | null }) => {
    setEditingPaymentId(p.id);
    setEPayAmount(String(p.amount));
    setEPayDate(p.paidAt ? p.paidAt.slice(0, 10) : "");
    setEPayNote(p.note ?? "");
    setEPayReceipt(null);
    setEPayRemoveReceipt(false);
    if (ePayReceiptRef.current) ePayReceiptRef.current.value = "";
  };

  const saveEditPayment = async (paymentId: number) => {
    if (!detailInvoice) return;
    const amount = parseFloat(ePayAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSavingPayment(true);
    try {
      const fd = new FormData();
      fd.append("amount", String(amount));
      if (ePayDate) fd.append("paidAt", ePayDate);
      fd.append("note", ePayNote);
      if (ePayReceipt) fd.append("receipt", ePayReceipt);
      else if (ePayRemoveReceipt) fd.append("removeReceipt", "true");
      const { data } = await API.patch(`/invoices/${detailInvoice.id}/payments/${paymentId}`, fd, { headers: { "Content-Type": undefined } });
      setDetailInvoice(data);
      setEditingPaymentId(null);
      toast.success("Payment updated");
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't update payment");
    } finally {
      setSavingPayment(false);
    }
  };
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
                    {fmt(inv.amount, inv.currency)}
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

                {/* paid / remaining (when a partial payment exists) */}
                {(inv.amountPaid ?? 0) > 0 && inv.status.toUpperCase() !== "PAID" && (
                  <div className="mt-2 max-w-sm">
                    <ProgressBar percent={inv.amount > 0 ? ((inv.amountPaid ?? 0) / inv.amount) * 100 : 0} size="xs" />
                    <div className="mt-1 flex justify-between text-xs tabular-nums">
                      <span className="font-semibold text-[var(--color-success-text)]">{fmt(inv.amountPaid ?? 0, inv.currency)} paid</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{fmt(inv.remaining ?? (inv.amount - (inv.amountPaid ?? 0)), inv.currency)} left</span>
                    </div>
                  </div>
                )}

                {inv.lineItems && inv.lineItems.length > 0 && (inv.subtotal != null || inv.taxAmount != null) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                    {inv.subtotal != null && <span>Subtotal: {fmt(inv.subtotal, inv.currency)}</span>}
                    {inv.taxRate != null && inv.taxRate > 0 && <span>Tax ({inv.taxRate}%): {fmt(inv.taxAmount ?? 0, inv.currency)}</span>}
                    <span className="font-medium text-[var(--color-text-secondary)]">Total: {fmt(inv.amount, inv.currency)}</span>
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
                  onClick={() => openDetail(inv)}
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

                <Button variant="secondary" size="sm" onClick={() => openDetail(inv, true)} className="flex-1 sm:flex-none">
                  Edit
                </Button>

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

      {/* Invoice detail modal (view + inline edit + payments) */}
      <Modal
        isOpen={!!detailInvoice}
        onClose={closeDetail}
        title={detailInvoice ? `Invoice #${detailInvoice.invoiceNumber}` : undefined}
        maxWidth="2xl"
      >
        {detailInvoice && (
          <div className="space-y-4">
            {/* Edit toggle */}
            <div className="flex justify-end">
              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit details
                </button>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Editing</span>
              )}
            </div>

            {/* Inline edit card (status / due date / payment link / notes) */}
            {editMode && (
              <div className="card-panel space-y-3 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="input-dark w-full px-3 py-2 text-sm">
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Due date</label>
                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="input-dark w-full px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Payment link</label>
                  <input type="url" value={editPaymentLink} onChange={(e) => setEditPaymentLink(e.target.value)} placeholder="https://..." className="input-dark w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="input-dark w-full resize-y px-3 py-2 text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setEditMode(false); openDetail(detailInvoice); }}>Cancel</Button>
                  <Button variant="primary" size="sm" loading={savingEdit} onClick={saveDetails}>{savingEdit ? "Saving…" : "Save changes"}</Button>
                </div>
              </div>
            )}

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
                          <td className="text-right tabular-nums">{fmt(li.unitPrice ?? 0, detailInvoice.currency)}</td>
                          <td className="text-right tabular-nums">{fmt((li.quantity ?? 0) * (li.unitPrice ?? 0), detailInvoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-panel flex flex-col items-end gap-1 rounded-xl p-4">
                  {detailInvoice.subtotal != null && (
                    <div className="flex w-48 justify-between text-sm tabular-nums">
                      <span className="text-[var(--color-text-muted)]">Subtotal</span>
                      <span>{fmt(detailInvoice.subtotal, detailInvoice.currency)}</span>
                    </div>
                  )}
                  {detailInvoice.taxRate != null && detailInvoice.taxRate > 0 && (
                    <div className="flex w-48 justify-between text-sm tabular-nums">
                      <span className="text-[var(--color-text-muted)]">Tax ({detailInvoice.taxRate}%)</span>
                      <span>{fmt(detailInvoice.taxAmount ?? 0, detailInvoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex w-48 justify-between border-t border-[var(--color-border)] pt-2 font-bold tabular-nums text-[var(--color-text-primary)]">
                    <span>Total</span>
                    <span>{fmt(detailInvoice.amount, detailInvoice.currency)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="card-panel flex justify-between rounded-xl p-4">
                <span className="text-[var(--color-text-muted)]">{detailInvoice.description || "Invoice amount"}</span>
                <span className="font-bold tabular-nums text-[var(--color-text-primary)]">{fmt(detailInvoice.amount, detailInvoice.currency)}</span>
              </div>
            )}
            {/* Payments — record partial payments and track what's left */}
            {(() => {
              const total = detailInvoice.amount || 0;
              const paid = detailInvoice.amountPaid ?? (detailInvoice.payments ?? []).reduce((s, p) => s + p.amount, 0);
              const remaining = detailInvoice.remaining ?? Math.max(0, total - paid);
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const fullyPaid = remaining <= 0 && total > 0;
              return (
                <div className="card-panel rounded-xl p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">Payments</span>
                    <span className={`text-sm font-bold tabular-nums ${fullyPaid ? "text-[var(--color-success-text)]" : "text-[var(--color-text-primary)]"}`}>{pct}%</span>
                  </div>
                  <ProgressBar percent={fullyPaid ? 100 : pct} size="md" />
                  <div className="mt-2 flex justify-between text-sm tabular-nums">
                    <span className="font-semibold text-[var(--color-success-text)]">{fmt(paid, detailInvoice.currency)} paid</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{fullyPaid ? "Fully paid" : `${fmt(remaining, detailInvoice.currency)} left`} of {fmt(total, detailInvoice.currency)}</span>
                  </div>

                  {(detailInvoice.payments ?? []).length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Payment history</p>
                      {(detailInvoice.payments ?? []).map((p) => (
                        <div key={p.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                          {editingPaymentId === p.id ? (
                            <div {...ePayDrop} className={`space-y-2.5 rounded-lg transition ${ePayDragging ? "ring-2 ring-[var(--color-focus-ring)]/50" : ""}`}>
                              {ePayDragging && (
                                <p className="rounded-lg border border-dashed border-[var(--color-focus-ring)] bg-[var(--color-focus-ring)]/5 py-1.5 text-center text-xs font-semibold text-[var(--color-text-secondary)]">Drop to replace receipt</p>
                              )}
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Amount</label>
                                  <input type="number" min="0" step="0.01" value={ePayAmount} onChange={(e) => setEPayAmount(e.target.value)} className="input-dark w-full px-3 py-2 text-sm" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Date</label>
                                  <input type="date" value={ePayDate} onChange={(e) => setEPayDate(e.target.value)} className="input-dark w-full px-3 py-2 text-sm" />
                                </div>
                              </div>
                              <input type="text" value={ePayNote} onChange={(e) => setEPayNote(e.target.value)} placeholder="Note (optional)" className="input-dark w-full px-3 py-2 text-sm" />
                              <div className="flex flex-wrap items-center gap-2">
                                <input ref={ePayReceiptRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" onChange={(e) => { setEPayReceipt(e.target.files?.[0] ?? null); setEPayRemoveReceipt(false); }} />
                                {ePayReceipt ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                                    <FileText className="h-3.5 w-3.5" /><span className="max-w-[9rem] truncate">{ePayReceipt.name}</span>
                                    <button type="button" onClick={() => { setEPayReceipt(null); if (ePayReceiptRef.current) ePayReceiptRef.current.value = ""; }} className="text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]"><X className="h-3.5 w-3.5" /></button>
                                  </span>
                                ) : (
                                  <button type="button" onClick={() => ePayReceiptRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)]">
                                    <Paperclip className="h-3.5 w-3.5" /> {p.receiptUrl ? "Replace receipt" : "Attach receipt"}
                                  </button>
                                )}
                                {p.receiptUrl && !ePayReceipt && (
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                                    <input type="checkbox" checked={ePayRemoveReceipt} onChange={(e) => setEPayRemoveReceipt(e.target.checked)} className="accent-[var(--color-destructive-text)]" />
                                    Remove receipt
                                  </label>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                  <button type="button" onClick={() => setEditingPaymentId(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
                                  <Button variant="primary" size="sm" loading={savingPayment} onClick={() => saveEditPayment(p.id)}>Save</Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-1 ring-inset ring-[var(--color-success-border)]">
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">{fmt(p.amount, detailInvoice.currency)}</p>
                                <p className="truncate text-xs text-[var(--color-text-muted)]">{formatDate(p.paidAt)}{p.note ? ` · ${p.note}` : ""}</p>
                              </div>
                              {p.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => setReceiptPreview(p.receiptUrl!)}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                                >
                                  {isImageUrl(p.receiptUrl) ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />} Receipt
                                </button>
                              )}
                              <button type="button" onClick={() => startEditPayment(p)} aria-label="Edit payment" className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"><Pencil className="h-4 w-4" /></button>
                              <button type="button" onClick={() => removePayment(p.id)} aria-label="Remove payment" className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)]"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!fullyPaid && (
                    <div {...payDrop} className={`mt-3 rounded-xl border-t border-[var(--color-border)] pt-3 transition ${payDragging ? "ring-2 ring-[var(--color-focus-ring)]/50" : ""}`}>
                      {payDragging && (
                        <p className="mb-2 rounded-lg border border-dashed border-[var(--color-focus-ring)] bg-[var(--color-focus-ring)]/5 py-2 text-center text-xs font-semibold text-[var(--color-text-secondary)]">Drop a receipt to attach</p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Amount</label>
                          <input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={remaining.toFixed(2)} className="input-dark w-full px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Date</label>
                          <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="input-dark w-full px-3 py-2 text-sm" />
                        </div>
                        <Button variant="primary" size="sm" onClick={recordPayment} loading={recording} disabled={!payAmount}>Record payment</Button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (optional)" className="input-dark w-full px-3 py-2 text-sm sm:flex-1" />
                        <input
                          ref={receiptRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          className="hidden"
                          onChange={(e) => setPayReceipt(e.target.files?.[0] ?? null)}
                        />
                        {payReceipt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[10rem] truncate" title={payReceipt.name}>{payReceipt.name}</span>
                            <button type="button" onClick={() => { setPayReceipt(null); if (receiptRef.current) receiptRef.current.value = ""; }} aria-label="Remove receipt" className="text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => receiptRef.current?.click()}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                          >
                            <Paperclip className="h-3.5 w-3.5" /> Attach receipt
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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

      {/* In-app receipt preview (image / PDF) — portaled to body so it sits
          ABOVE the invoice modal (which itself portals at z-60). */}
      {receiptPreview && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-fade-in" onClick={() => setReceiptPreview(null)}>
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-end gap-2">
              <a
                href={getFileUrl(receiptPreview)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
              <button type="button" onClick={() => setReceiptPreview(null)} aria-label="Close" className="rounded-lg bg-white/10 p-2 text-white/90 backdrop-blur transition hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
            {isImageUrl(receiptPreview) ? (
              <img src={getFileUrl(receiptPreview)} alt="Receipt" className="mx-auto max-h-[85vh] w-auto rounded-xl object-contain shadow-elev-lg" />
            ) : isPdfUrl(receiptPreview) ? (
              <iframe src={getFileUrl(receiptPreview)} title="Receipt" className="h-[85vh] w-full rounded-xl bg-white shadow-elev-lg" />
            ) : (
              <div className="rounded-2xl bg-[var(--color-panel-solid)] p-10 text-center">
                <FileText className="mx-auto h-12 w-12 text-[var(--color-text-muted)]" />
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">This file type can’t be previewed here.</p>
                <a href={getFileUrl(receiptPreview)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold">
                  <Download className="h-4 w-4" /> Download receipt
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InvoicesList;
