import { useState } from "react";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../ui/controls";

interface User {
  id: number;
  name: string;
  email: string;
}

interface InvoiceFormProps {
  onSubmit: (data: FormData, sendEmail: boolean) => void;
  clients: User[];
  colors: { primary: string };
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, clients, colors }) => {
  const [formData, setFormData] = useState({
    clientId: "",
    amount: "",
    dueDate: "",
    paymentLink: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (sendEmail: boolean) => {
    if (!formData.clientId || !formData.amount || !formData.dueDate) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("clientId", formData.clientId);
      submitData.append("amount", formData.amount);
      submitData.append("dueDate", formData.dueDate);
      if (formData.paymentLink) {
        submitData.append("paymentLink", formData.paymentLink);
      }
      submitData.append("sendEmail", sendEmail.toString());
      if (selectedFile) {
        submitData.append("file", selectedFile);
      }

      await onSubmit(submitData, sendEmail);
      
      setFormData({ clientId: "", amount: "", dueDate: "", paymentLink: "" });
      setSelectedFile(null);
    } catch (error) {
      console.error("Error submitting invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const selectedClient = clients.find(c => c.id === parseInt(formData.clientId));

  return (
    <div className="mb-6 rounded-2xl card-panel p-6 shadow-lg shadow-[var(--color-shadow)] backdrop-blur-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--color-surface-3)] p-2">
          <svg className="h-6 w-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-theme-primary">Create New Invoice</h3>
          <p className="text-sm text-theme-muted">Fill in the details and attach the invoice file</p>
        </div>
      </div>

      {/* Main Form Fields */}
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
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedClient && (
            <p className="mt-1 text-xs text-theme-muted">
              <svg className="mr-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {selectedClient.email}
            </p>
          )}
        </div>

        <div className="w-full">
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
              required
            />
          </div>
        </div>

        <div className="w-full">
          <label className={CONTROL_LABEL}>
            Due Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
        </div>
      </div>

      {/* Payment Link Field */}
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
        <p className="mt-1 text-xs text-theme-muted">
          Add a Stripe, PayPal, or other payment link for easy client payment
        </p>
      </div>

      {/* File Upload Section */}
      <div className="mb-6">
        <label className={CONTROL_LABEL}>
          Invoice File
          <span className="ml-1 text-xs font-normal text-theme-muted">(Optional)</span>
        </label>
        {selectedFile ? (
          <div className="flex items-center justify-between rounded-lg border-2 border-[var(--color-border)] card-panel p-4 transition hover:border-[var(--color-border-hover)]">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <p className="text-sm font-semibold text-theme-primary">{selectedFile.name}</p>
                <p className="text-xs text-theme-muted">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition hover:border-red-500/30 hover:bg-red-500/15"
              title="Remove file"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)]">
            <svg className="mb-3 h-12 w-12 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-1 text-sm font-semibold text-theme-secondary">Click to upload invoice file</p>
            <p className="text-xs text-theme-muted">PDF, DOC, DOCX, or images (max 10MB)</p>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />
          </label>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row">
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || !formData.clientId || !formData.amount || !formData.dueDate}
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
          disabled={isSubmitting || !formData.clientId || !formData.amount || !formData.dueDate}
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
          onClick={() => {
            setFormData({ clientId: "", amount: "", dueDate: "", paymentLink: "" });
            setSelectedFile(null);
          }}
          disabled={isSubmitting}
          className="btn-secondary flex h-11 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {selectedClient && (
        <div className="mt-4 rounded-lg card-panel p-4">
          <p className="text-sm text-theme-secondary">
            <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong className="text-theme-primary">Request Payment</strong> will send an email to <strong className="text-theme-primary">{selectedClient.email}</strong>{selectedFile && " with the invoice file attached"}{formData.paymentLink && " and payment link"}.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;