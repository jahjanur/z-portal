import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import InvoiceForm from "../../components/admin/InvoiceForm";
import InvoicesList from "../../components/admin/InvoicesList";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";

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
    deleteInvoice,
    requestPayment,
    fetchAll,
  } = useAdmin();
  const [showPaidInvoices, setShowPaidInvoices] = useState(false);
  const isAdmin = localStorage.getItem("role") === "ADMIN";

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
          <InvoicesList invoices={displayPending} onDelete={deleteInvoice} onRequestPayment={(inv) => requestPayment(inv.id)} onChanged={fetchAll} colors={colors} />
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
              <InvoicesList invoices={displayPaid} onDelete={deleteInvoice} onRequestPayment={(inv) => requestPayment(inv.id)} onChanged={fetchAll} colors={colors} />
            ) : (
              <EmptyState compact title="No paid invoices yet" description="Paid invoices will show up here once payments come in." />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
