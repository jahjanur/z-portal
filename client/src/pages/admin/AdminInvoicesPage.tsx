import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import type { Invoice } from "../../contexts/AdminContext";
import InvoiceForm from "../../components/admin/InvoiceForm";
import InvoicesList from "../../components/admin/InvoicesList";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT, CONTROL_TEXTAREA } from "../../components/ui/controls";

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
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Create invoices, track payments and follow up on overdue balances"
      />

      <InvoiceForm onSubmit={createInvoice} clients={displayClients} colors={colors} />

      <section className="animate-fade-up">
        <h3 className="section-title mb-4">
          Pending Invoices{" "}
          <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
            ({displayPending.length})
          </span>
        </h3>
        {displayPending.length > 0 ? (
          <InvoicesList invoices={displayPending} onDelete={deleteInvoice} onEdit={openEdit} onRequestPayment={(inv) => requestPayment(inv.id)} colors={colors} />
        ) : (
          <EmptyState
            compact
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="All invoices are paid"
            description="There are no pending invoices right now."
          />
        )}
      </section>

      <section className="animate-fade-up">
        <button
          type="button"
          onClick={() => setShowPaidInvoices(!showPaidInvoices)}
          className="card-panel row-hover mb-4 flex w-full items-center justify-between rounded-xl p-4 text-left"
          aria-expanded={showPaidInvoices}
        >
          <h3 className="section-title">
            Paid Invoices{" "}
            <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
              ({displayPaid.length})
            </span>
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
              <EmptyState compact title="No paid invoices yet" description="Paid invoices will show up here once payments come in." />
            )}
          </div>
        )}
      </section>

      {/* Invoice edit modal */}
      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title={editingInvoice ? `Edit Invoice #${editingInvoice.invoiceNumber}` : undefined}
        maxWidth="md"
      >
        {editingInvoice && (
          <div className="space-y-4">
            <div>
              <label className={CONTROL_LABEL}>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={CONTROL_SELECT}>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
            <div>
              <label className={CONTROL_LABEL}>Due Date</label>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={CONTROL_INPUT} />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Payment Link</label>
              <input type="url" value={editPaymentLink} onChange={(e) => setEditPaymentLink(e.target.value)} placeholder="https://..." className={CONTROL_INPUT} />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className={CONTROL_TEXTAREA} />
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setEditingInvoice(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={editSaving} onClick={saveEdit}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
