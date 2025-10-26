import { useState } from "react";

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
    <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
          <svg className="w-6 h-6" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Create New Invoice</h3>
          <p className="text-sm text-gray-500">Fill in the details and attach the invoice file</p>
        </div>
      </div>
      
      {/* Main Form Fields */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
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
            <p className="mt-1 text-xs text-gray-500">
              <svg className="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {selectedClient.email}
            </p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute text-gray-500 transform -translate-y-1/2 left-4 top-1/2">$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full py-3 pl-8 pr-4 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              required
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
            required
          />
        </div>
      </div>

      {/* Payment Link Field */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Payment Link
          <span className="ml-1 text-xs font-normal text-gray-500">(Optional)</span>
        </label>
        <div className="relative">
          <span className="absolute text-gray-400 transform -translate-y-1/2 left-4 top-1/2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <input
            type="url"
            placeholder="https://stripe.com/pay/... or PayPal link"
            value={formData.paymentLink}
            onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
            className="w-full py-3 pl-12 pr-4 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Add a Stripe, PayPal, or other payment link for easy client payment
        </p>
      </div>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Invoice File
          <span className="ml-1 text-xs font-normal text-gray-500">(Optional)</span>
        </label>
        {selectedFile ? (
          <div className="flex items-center justify-between p-4 transition-all bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
              title="Remove file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 transition-all bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-1 text-sm font-semibold text-gray-700">Click to upload invoice file</p>
            <p className="text-xs text-gray-500">PDF, DOC, DOCX, or images (max 10MB)</p>
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
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 sm:flex-row">
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || !formData.clientId || !formData.amount || !formData.dueDate}
          className="flex items-center justify-center flex-1 gap-2 px-6 py-3 text-sm font-semibold text-white transition-all rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: colors.primary }}
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
          className="flex items-center justify-center flex-1 gap-2 px-6 py-3 text-sm font-semibold transition-all bg-white border-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: colors.primary, borderColor: colors.primary }}
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
          className="px-6 py-3 text-sm font-semibold text-gray-700 transition-all bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {selectedClient && (
        <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800">
            <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>Request Payment</strong> will send an email to <strong>{selectedClient.email}</strong>{selectedFile && ' with the invoice file attached'}{formData.paymentLink && ' and payment link'}.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;