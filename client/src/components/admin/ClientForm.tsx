import { useState } from "react";
import toast from "react-hot-toast";
import DatePicker from "../ui/DatePicker";
import API from "../../api";
import Button from "../ui/Button";
import { CONTROL_INPUT, CONTROL_LABEL, BTN_ACTION } from "../ui/controls";

interface ClientFormProps {
  onSubmit?: (data: any) => void;
  onInviteSent?: () => void;
  colors: { primary: string };
  hideDomainAndHosting?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ onInviteSent, hideDomainAndHosting = false }) => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    colorHex: "#6b7280",
    postalAddress: "",
    domainName: "",
    domainExpiry: "",
    hostingPlan: "",
    hostingExpiry: "",
    sslExpiry: "",
  });

  const [showHostingFields, setShowHostingFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.company || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post("/invites", {
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: "CLIENT",
        company: formData.company.trim(),
        domainName: formData.domainName || undefined,
        domainExpiry: formData.domainExpiry || undefined,
        hostingPlan: formData.hostingPlan || undefined,
        hostingExpiry: formData.hostingExpiry || undefined,
      });
      toast.success("Invite sent to client!");
      setFormData({
        name: "",
        company: "",
        email: "",
        colorHex: "#6b7280",
        postalAddress: "",
        domainName: "",
        domainExpiry: "",
        hostingPlan: "",
        hostingExpiry: "",
        sslExpiry: "",
      });
      setShowHostingFields(false);
      onInviteSent?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setLifespanExpiry = (years: number) => {
    const today = new Date();
    const future = new Date(today);
    future.setFullYear(today.getFullYear() + years);
    const formatted = future.toISOString().split("T")[0];
    setFormData({
      ...formData,
      domainExpiry: formatted,
      hostingExpiry: formatted,
    });
  };

  return (
    <div className="card-panel mb-6 p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="section-title">Add New Client</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Create a new client account and send invitation</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Email invite will be sent
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={CONTROL_LABEL}>
            Contact Person <span className="text-[var(--color-destructive-text)]">*</span>
          </label>
          <input
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
        </div>
        <div>
          <label className={CONTROL_LABEL}>
            Company Name <span className="text-[var(--color-destructive-text)]">*</span>
          </label>
          <input
            placeholder="Acme Corporation"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
        </div>

        <div className="col-span-full">
          <label className={CONTROL_LABEL}>
            Email Address <span className="text-[var(--color-destructive-text)]">*</span>
          </label>
          <input
            placeholder="john@example.com"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
        </div>

        {/* Toggle Hosting Button - hidden for EraSphere */}
        {!hideDomainAndHosting && (
          <div className="col-span-full pt-1">
            <button
              type="button"
              onClick={() => setShowHostingFields(!showHostingFields)}
              className={`${BTN_ACTION} w-full sm:w-auto ${
                showHostingFields ? "border-[var(--color-border-focus)] bg-[var(--color-surface-3)]" : ""
              }`}
            >
              {showHostingFields ? (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Hide Domain &amp; Hosting
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Domain &amp; Hosting
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Domain & Hosting Fields (Optional) - hidden for EraSphere */}
      {!hideDomainAndHosting && showHostingFields && (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="section-title !mb-0">Domain &amp; Hosting Information</h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Lifespan:</span>
              {[1, 2, 3].map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => setLifespanExpiry(years)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-border-hover)]"
                >
                  {years === 1 && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {years} {years === 1 ? "year" : "years"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CONTROL_LABEL}>Domain Name</label>
              <input
                placeholder="example.com"
                value={formData.domainName}
                onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
                className={CONTROL_INPUT}
              />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Domain Expiry Date</label>
              <DatePicker
                value={formData.domainExpiry}
                onChange={(domainExpiry) => setFormData({ ...formData, domainExpiry: domainExpiry || "" })}
                placeholder="yyyy/mm/dd"
                className={CONTROL_INPUT}
              />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Hosting Plan</label>
              <input
                placeholder="Basic / Premium / Enterprise"
                value={formData.hostingPlan}
                onChange={(e) => setFormData({ ...formData, hostingPlan: e.target.value })}
                className={CONTROL_INPUT}
              />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Hosting Expiry Date</label>
              <DatePicker
                value={formData.hostingExpiry}
                onChange={(hostingExpiry) => setFormData({ ...formData, hostingExpiry: hostingExpiry || "" })}
                placeholder="yyyy/mm/dd"
                className={CONTROL_INPUT}
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 border-t border-[var(--color-border)] pt-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {!isSubmitting && (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
            {isSubmitting ? "Sending Invite..." : "Invite Client"}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)] sm:text-right">
          <span className="text-[var(--color-destructive-text)]">*</span> Required fields &middot; Client will receive an email to set their password and join
        </p>
      </div>
    </div>
  );
};

export default ClientForm;
