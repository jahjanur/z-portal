import React, { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import InvoiceForm from "../../components/admin/InvoiceForm";
import InvoicesList from "../../components/admin/InvoicesList";

const colors = { primary: "" };

export default function AdminInvoicesPage() {
  const { clients, pendingInvoices, paidInvoices, createInvoice, deleteInvoice } = useAdmin();
  const [showPaidInvoices, setShowPaidInvoices] = useState(false);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-4 shadow-xl backdrop-blur-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Invoices Management</h2>
        <InvoiceForm onSubmit={createInvoice} clients={clients} colors={colors} />

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
            Pending Invoices <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({pendingInvoices.length})</span>
          </h3>
          {pendingInvoices.length > 0 ? (
            <InvoicesList invoices={pendingInvoices} onDelete={deleteInvoice} colors={colors} />
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
              Paid Invoices <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({paidInvoices.length})</span>
            </h3>
            <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showPaidInvoices ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPaidInvoices && (
            <div>
              {paidInvoices.length > 0 ? (
                <InvoicesList invoices={paidInvoices} onDelete={deleteInvoice} colors={colors} />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No paid invoices yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
