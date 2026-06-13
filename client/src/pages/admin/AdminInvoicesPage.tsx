import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import type { Invoice } from "../../contexts/AdminContext";
import InvoiceForm from "../../components/admin/InvoiceForm";
import InvoicesList from "../../components/admin/InvoicesList";

const colors = { primary: "" };

export default function AdminInvoicesPage() {
  const {
    clients,
    pendingInvoices,
    paidInvoices,
    adminOwnClients,
    adminOwnPendingInvoices,
    adminOwnPaidInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    requestPayment,
  } = useAdmin();
  const [showPaidInvoices, setShowPaidInvoices] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentLink, setEditPaymentLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const isAdmin = localStorage.getItem("role") === "ADMIN";

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditStatus(inv.status);
    setEditDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : "");
    setEditPaymentLink(inv.paymentLink ?? "");
    setEditNotes(inv.notes ?? "");
  };

  const saveEdit = async () => {
    if (!editingInvoice) return;
    setEditSaving(true);
    try {
      await updateInvoice(editingInvoice.id, {
        status: editStatus,
        dueDate: editDueDate || undefined,
        paymentLink: editPaymentLink || undefined,
        notes: editNotes || undefined,
      });
      setEditingInvoice(null);
    } finally {
      setEditSaving(false);
    }
  };

  const displayClients = isAdmin ? adminOwnClients : clients;
  const displayPending = isAdmin ? adminOwnPendingInvoices : pendingInvoices;
  const displayPaid = isAdmin ? adminOwnPaidInvoices : paidInvoices;

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Invoices Management</h2>
        <InvoiceForm onSubmit={createInvoice} clients={displayClients} colors={colors} />

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
            Pending Invoices <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({displayPending.length})</span>
          </h3>
          {displayPending.length > 0 ? (
            <InvoicesList invoices={displayPending} onDelete={deleteInvoice} onEdit={openEdit} onRequestPayment={(inv) => requestPayment(inv.id)} colors={colors} />
          ) : (
            <div className="card-panel py-8 text-center rounded-xl">
              <svg className="mx-auto mb-3 h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">All invoices are paid! 💰</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPaidInvoices(!showPaidInvoices)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-colors hover:bg-[var(--color-surface-3)]"
          >
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Paid Invoices <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({displayPaid.length})</span>
            </h3>
            <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showPaidInvoices ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPaidInvoices && (
            <div>
              {displayPaid.length > 0 ? (
                <InvoicesList invoices={displayPaid} onDelete={deleteInvoice} onEdit={openEdit} onRequestPayment={(inv) => requestPayment(inv.id)} colors={colors} />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No paid invoices yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice edit modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingInvoice(null)}>
          <div className="rounded-2xl card-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Invoice #{editingInvoice.invoiceNumber}</h3>
              <button type="button" onClick={() => setEditingInvoice(null)} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Due Date</label>
                <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Payment Link</label>
                <input type="url" value={editPaymentLink} onChange={(e) => setEditPaymentLink(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingInvoice(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="button" onClick={saveEdit} disabled={editSaving} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
