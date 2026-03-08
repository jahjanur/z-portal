import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../ui/controls";
import DatePicker from "../ui/DatePicker";

interface User {
  id: number;
  name: string;
  email: string;
}

export interface InvoiceLineItemInput {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceFormProps {
  onSubmit: (data: FormData, sendEmail: boolean) => void;
  clients: User[];
  colors: { primary: string };
}

const defaultLineItem = (): InvoiceLineItemInput => ({
  name: "",
  description: "",
  quantity: "1",
  unitPrice: "",
});

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, clients }) => {
  const [formData, setFormData] = useState({
    clientId: "",
    amount: "",
    dueDate: "",
    issueDate: "",
    paymentLink: "",
    paymentTerms: "",
    notes: "",
    taxRate: "",
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasLineItems = lineItems.length > 0;
  const validLineItems = useMemo(() => {
    return lineItems
      .map((li) => ({
        name: li.name.trim(),
        description: li.description.trim() || undefined,
        quantity: parseFloat(li.quantity) || 0,
        unitPrice: parseFloat(li.unitPrice) || 0,
      }))
      .filter((li) => li.name && li.quantity > 0 && li.unitPrice >= 0);
  }, [lineItems]);

  const subtotal = useMemo(
    () => validLineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0),
    [validLineItems]
  );
  const taxRateNum = formData.taxRate !== "" ? parseFloat(formData.taxRate) || 0 : 0;
  const taxAmount = subtotal * (taxRateNum / 100);
  const total = subtotal + taxAmount;

  const canSubmitWithLines = hasLineItems && validLineItems.length > 0 && formData.clientId && formData.dueDate;
  const canSubmitWithAmount = !hasLineItems && formData.clientId && formData.amount && formData.dueDate;
  const canSubmit = canSubmitWithLines || canSubmitWithAmount;

  const addLineItem = () => setLineItems((prev) => [...prev, defaultLineItem()]);
  const removeLineItem = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));
  const updateLineItem = (index: number, field: keyof InvoiceLineItemInput, value: string) => {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)));
  };

  const handleSubmit = async (sendEmail: boolean) => {
    if (!canSubmit) {
      if (hasLineItems && validLineItems.length === 0) {
        toast.error("Add at least one line item with name, quantity, and unit price");
      } else if (!hasLineItems && !formData.amount) {
        toast.error("Please fill in amount or add line items");
      } else {
        toast.error("Please fill in all required fields");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append("clientId", formData.clientId);
      submitData.append("dueDate", formData.dueDate);
      if (formData.paymentLink) submitData.append("paymentLink", formData.paymentLink);
      submitData.append("sendEmail", sendEmail.toString());

      if (hasLineItems && validLineItems.length > 0) {
        submitData.append("lineItems", JSON.stringify(validLineItems));
        if (formData.issueDate) submitData.append("issueDate", formData.issueDate);
        if (formData.paymentTerms) submitData.append("paymentTerms", formData.paymentTerms);
        if (formData.notes) submitData.append("notes", formData.notes);
        if (formData.taxRate !== "") submitData.append("taxRate", formData.taxRate);
      } else {
        submitData.append("amount", formData.amount);
        if (formData.issueDate) submitData.append("issueDate", formData.issueDate);
        if (formData.paymentTerms) submitData.append("paymentTerms", formData.paymentTerms);
        if (formData.notes) submitData.append("notes", formData.notes);
      }

      await onSubmit(submitData, sendEmail);

      setFormData({
        clientId: "",
        amount: "",
        dueDate: "",
        issueDate: "",
        paymentLink: "",
        paymentTerms: "",
        notes: "",
        taxRate: "",
      });
      setLineItems([]);
    } catch (error) {
      console.error("Error submitting invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData({
      clientId: "",
      amount: "",
      dueDate: "",
      issueDate: "",
      paymentLink: "",
      paymentTerms: "",
      notes: "",
      taxRate: "",
    });
    setLineItems([]);
  };

  const selectedClient = clients.find((c) => c.id === parseInt(formData.clientId, 10));

  return (
    <div className="mb-6 rounded-2xl card-panel p-6 shadow-lg shadow-[var(--color-shadow)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--color-surface-3)] p-2">
          <svg className="h-6 w-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-theme-primary">Create New Invoice</h3>
          <p className="text-sm text-theme-muted">Fill in the details and optionally add line items</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
        <div className="w-full">
          <label className={CONTROL_LABEL}>
            Client <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className={CONTROL_SELECT}
            required
            title={selectedClient ? selectedClient.email : undefined}
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className={CONTROL_LABEL}>Issue Date (optional)</label>
          <DatePicker
            value={formData.issueDate}
            onChange={(issueDate) => setFormData({ ...formData, issueDate })}
            placeholder="yyyy/mm/dd"
          />
        </div>

        <div className="w-full">
          <label className={CONTROL_LABEL}>
            Due Date <span className="text-red-400">*</span>
          </label>
          <DatePicker
            value={formData.dueDate}
            onChange={(dueDate) => setFormData({ ...formData, dueDate })}
            placeholder="yyyy/mm/dd"
          />
        </div>
      </div>

      {/* Line items or single amount */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <label className={CONTROL_LABEL}>Line items</label>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-medium text-theme-secondary hover:bg-[var(--color-surface-3)]"
          >
            + Add line
          </button>
        </div>

        {hasLineItems ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="p-2 text-left font-semibold text-theme-primary">Item / Service</th>
                    <th className="p-2 text-left font-semibold text-theme-primary">Description</th>
                    <th className="w-24 p-2 text-right font-semibold text-theme-primary">Qty</th>
                    <th className="w-28 p-2 text-right font-semibold text-theme-primary">Unit Price</th>
                    <th className="w-28 p-2 text-right font-semibold text-theme-primary">Total</th>
                    <th className="w-10 p-2" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => {
                    const qty = parseFloat(li.quantity) || 0;
                    const up = parseFloat(li.unitPrice) || 0;
                    const lineTotal = qty * up;
                    return (
                      <tr key={i} className="border-b border-[var(--color-border)]">
                        <td className="p-2">
                          <input
                            type="text"
                            value={li.name}
                            onChange={(e) => updateLineItem(i, "name", e.target.value)}
                            placeholder="Item name"
                            className={CONTROL_INPUT}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={li.description}
                            onChange={(e) => updateLineItem(i, "description", e.target.value)}
                            placeholder="Optional"
                            className={CONTROL_INPUT}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={li.quantity}
                            onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                            className={`${CONTROL_INPUT} w-full text-right`}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={li.unitPrice}
                            onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                            placeholder="0.00"
                            className={`${CONTROL_INPUT} w-full text-right`}
                          />
                        </td>
                        <td className="p-2 text-right font-medium text-theme-primary">
                          ${lineTotal.toFixed(2)}
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => removeLineItem(i)}
                            className="rounded p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            title="Remove line"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col items-end gap-1 rounded-lg bg-[var(--color-surface-2)] p-4">
              <div className="flex w-48 justify-between text-sm">
                <span className="text-theme-muted">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex w-48 items-center justify-between gap-2 text-sm">
                <span className="text-theme-muted">Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  placeholder="0"
                  className={`${CONTROL_INPUT} w-20 text-right`}
                />
              </div>
              {taxRateNum > 0 && (
                <div className="flex w-48 justify-between text-sm">
                  <span className="text-theme-muted">Tax amount</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex w-48 justify-between border-t border-[var(--color-border)] pt-2 text-base font-bold text-theme-primary">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full max-w-xs">
            <label className={CONTROL_LABEL}>
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-theme-muted">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`${CONTROL_INPUT} pl-8`}
              />
            </div>
            <p className="mt-1 text-xs text-theme-muted">Or add line items above for itemized billing</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className={CONTROL_LABEL}>
          Payment terms / custom message
          <span className="ml-1 text-xs font-normal text-theme-muted">(Optional)</span>
        </label>
        <textarea
          value={formData.paymentTerms}
          onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
          placeholder="e.g. A 20% deposit has been paid. Remaining balance due upon completion."
          rows={3}
          className={`${CONTROL_INPUT} min-h-[88px] resize-y py-3`}
        />
      </div>

      <div className="mb-6">
        <label className={CONTROL_LABEL}>
          Notes
          <span className="ml-1 text-xs font-normal text-theme-muted">(Optional)</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes for the client"
          rows={3}
          className={`${CONTROL_INPUT} min-h-[88px] resize-y py-3`}
        />
      </div>

      <div className="mb-6">
        <label className={CONTROL_LABEL}>
          Payment Link
          <span className="ml-1 text-xs font-normal text-theme-muted">(Optional)</span>
        </label>
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <input
            type="url"
            placeholder="https://stripe.com/pay/... or PayPal link"
            value={formData.paymentLink}
            onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
            className={`${CONTROL_INPUT} pl-12`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row">
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || !canSubmit}
          className="btn-primary flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Invoice
            </>
          )}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting || !canSubmit}
          className="btn-secondary flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Create & Request Payment
            </>
          )}
        </button>
        <button
          type="button"
          onClick={clearForm}
          disabled={isSubmitting}
          className="btn-secondary flex h-11 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {selectedClient && (
        <div className="mt-4 rounded-lg card-panel p-4">
          <p className="text-sm text-theme-secondary">
            <svg className="mr-1 inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong className="text-theme-primary">Request Payment</strong> will send an email to{" "}
            <strong className="text-theme-primary">{selectedClient.email}</strong>
            {formData.paymentLink && " with the payment link"}.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
