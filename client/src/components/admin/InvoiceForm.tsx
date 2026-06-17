import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT, CONTROL_TEXTAREA } from "../ui/controls";
import DatePicker from "../ui/DatePicker";
import Button from "../ui/Button";

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
    <div className="space-y-6 animate-fade-up">
      {/* Details */}
      <section className="card-panel rounded-2xl p-5 sm:p-6">
        <h3 className="section-title">Details</h3>
        <p className="mt-1 mb-5 text-sm text-[var(--color-text-muted)]">
          Pick a client, set the dates, then add line items below or a single amount.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <div className="w-full">
            <label className={CONTROL_LABEL}>
              Client <span className="text-[var(--color-destructive-text)]">*</span>
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
              usePortal
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>
              Due Date <span className="text-[var(--color-destructive-text)]">*</span>
            </label>
            <DatePicker
              value={formData.dueDate}
              onChange={(dueDate) => setFormData({ ...formData, dueDate })}
              placeholder="yyyy/mm/dd"
              usePortal
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={CONTROL_LABEL}>
              Payment terms / custom message
              <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">(Optional)</span>
            </label>
            <textarea
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="e.g. A 20% deposit has been paid. Remaining balance due upon completion."
              rows={3}
              className={`${CONTROL_TEXTAREA} py-3`}
            />
          </div>
          <div>
            <label className={CONTROL_LABEL}>
              Notes
              <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">(Optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes for the client"
              rows={3}
              className={`${CONTROL_TEXTAREA} py-3`}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={CONTROL_LABEL}>
            Payment Link
            <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">(Optional)</span>
          </label>
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
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
      </section>

      {/* Line items */}
      <section className="card-panel rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="section-title">Line items</h3>
          <Button variant="secondary" size="sm" onClick={addLineItem}>
            + Add line
          </Button>
        </div>

        {hasLineItems ? (
          <div className="space-y-2">
            {/* Column labels (desktop only) */}
            <div className="hidden gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:grid sm:grid-cols-[1fr_1fr_5rem_7rem_5.5rem_2.25rem]">
              <span>Item / Service</span>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {lineItems.map((li, i) => {
              const qty = parseFloat(li.quantity) || 0;
              const up = parseFloat(li.unitPrice) || 0;
              const lineTotal = qty * up;
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:grid-cols-[1fr_1fr_5rem_7rem_5.5rem_2.25rem]"
                >
                  <input
                    type="text"
                    value={li.name}
                    onChange={(e) => updateLineItem(i, "name", e.target.value)}
                    placeholder="Item name"
                    className={CONTROL_INPUT}
                  />
                  <input
                    type="text"
                    value={li.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Description (optional)"
                    className={CONTROL_INPUT}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                    aria-label="Quantity"
                    className={`${CONTROL_INPUT} text-right`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.unitPrice}
                    onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                    placeholder="0.00"
                    aria-label="Unit price"
                    className={`${CONTROL_INPUT} text-right`}
                  />
                  <span className="text-right text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                    ${lineTotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    className="justify-self-end rounded-lg p-1.5 text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                    title="Remove line"
                    aria-label={`Remove line ${i + 1}`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-xs">
            <label className={CONTROL_LABEL}>
              Amount <span className="text-[var(--color-destructive-text)]">*</span>
            </label>
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`${CONTROL_INPUT} pl-8`}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Or add line items for itemized billing</p>
          </div>
        )}
      </section>

      {/* Totals */}
      {hasLineItems && (
        <section className="card-panel rounded-2xl p-5 sm:p-6">
          <h3 className="section-title mb-4">Totals</h3>
          <div className="flex justify-end">
            <div className="card-panel w-full max-w-xs rounded-xl p-4">
              <div className="flex justify-between text-sm tabular-nums">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span className="font-medium text-[var(--color-text-primary)]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--color-text-muted)]">Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  placeholder="0"
                  aria-label="Tax rate percent"
                  className={`${CONTROL_INPUT} w-24 text-right`}
                />
              </div>
              {taxRateNum > 0 && (
                <div className="mt-2 flex justify-between text-sm tabular-nums">
                  <span className="text-[var(--color-text-muted)]">Tax amount</span>
                  <span className="font-medium text-[var(--color-text-primary)]">${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-3 flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting || !canSubmit}
          onClick={() => handleSubmit(false)}
          className="flex-1"
        >
          {isSubmitting ? "Creating..." : "Create Invoice"}
        </Button>
        <Button
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting || !canSubmit}
          onClick={() => handleSubmit(true)}
          className="flex-1"
        >
          {isSubmitting ? "Sending..." : "Create & Request Payment"}
        </Button>
        <Button variant="ghost" disabled={isSubmitting} onClick={clearForm}>
          Clear
        </Button>
      </div>

      {selectedClient && (
        <div className="card-panel rounded-xl p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text-primary)]">Request Payment</strong> will send an email to{" "}
            <strong className="text-[var(--color-text-primary)]">{selectedClient.email}</strong>
            {formData.paymentLink && " with the payment link"}.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
