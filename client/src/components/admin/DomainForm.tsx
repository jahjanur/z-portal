import React, { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../ui/controls";
import DatePicker from "../ui/DatePicker";

interface User {
  id: number;
  name: string;
  company?: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "RENEWAL_DUE", label: "Renewal Due" },
  { value: "RENEWED", label: "Renewed" },
];

const LIFESPAN_OPTIONS = [
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "custom", label: "Custom" },
];

export interface DomainFormPayload {
  clientId: string;
  domainName: string;
  notes?: string;
  activationDate?: string;
  expirationDate?: string;
  lifespanYears?: number | null;
  status?: string;
}

interface DomainFormProps {
  onSubmit: (domainData: DomainFormPayload) => Promise<void>;
  onUpdate: (domainId: number, domainData: Omit<DomainFormPayload, "clientId">) => Promise<void>;
  clients: User[];
  colors: { primary: string; secondary: string; accent: string; light: string; dark: string };
  editingDomain: {
    id: number;
    domainName: string;
    notes?: string;
    clientId: number;
    activationDate?: string | null;
    expirationDate?: string | null;
    lifespanYears?: number | null;
    status?: string;
    activationEmailSentAt?: string | null;
    renewalReminderSentAt?: string | null;
  } | null;
  onCancelEdit: () => void;
}

function toDateInputValue(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD as dd/mm/yyyy for display */
function formatDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const DomainForm: React.FC<DomainFormProps> = ({
  onSubmit,
  onUpdate,
  clients,
  editingDomain,
  onCancelEdit,
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    domainName: "",
    notes: "",
    activationDate: "",
    expirationDate: "",
    lifespan: "1",
    customLifespanYears: "" as string,
    status: "PENDING",
  });

  useEffect(() => {
    if (editingDomain && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingDomain]);

  useEffect(() => {
    if (editingDomain) {
      setFormData({
        clientId: editingDomain.clientId.toString(),
        domainName: editingDomain.domainName,
        notes: editingDomain.notes || "",
        activationDate: toDateInputValue(editingDomain.activationDate),
        expirationDate: toDateInputValue(editingDomain.expirationDate),
        lifespan:
          editingDomain.lifespanYears === 2
            ? "2"
            : editingDomain.lifespanYears === 3
              ? "3"
              : editingDomain.lifespanYears === 1
                ? "1"
                : "custom",
        customLifespanYears:
          editingDomain.lifespanYears != null && ![1, 2, 3].includes(editingDomain.lifespanYears)
            ? String(editingDomain.lifespanYears)
            : "",
        status: editingDomain.status || "PENDING",
      });
    } else {
      setFormData({
        clientId: "",
        domainName: "",
        notes: "",
        activationDate: "",
        expirationDate: "",
        lifespan: "1",
        customLifespanYears: "",
        status: "PENDING",
      });
    }
  }, [editingDomain]);

  useEffect(() => {
    if (formData.activationDate && formData.lifespan !== "custom") {
      const years = parseInt(formData.lifespan, 10);
      if (years >= 1) {
        const d = new Date(formData.activationDate);
        d.setFullYear(d.getFullYear() + years);
        setFormData((prev) => ({ ...prev, expirationDate: d.toISOString().slice(0, 10) }));
      }
    }
    if (formData.activationDate && formData.lifespan === "custom" && formData.customLifespanYears) {
      const years = parseInt(formData.customLifespanYears, 10);
      if (years >= 1) {
        const d = new Date(formData.activationDate);
        d.setFullYear(d.getFullYear() + years);
        setFormData((prev) => ({ ...prev, expirationDate: d.toISOString().slice(0, 10) }));
      }
    }
  }, [formData.activationDate, formData.lifespan, formData.customLifespanYears]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.domainName) {
      toast.error("Domain name is required.");
      return;
    }
    const lifespanYears =
      formData.lifespan === "custom"
        ? formData.customLifespanYears
          ? parseInt(formData.customLifespanYears, 10)
          : null
        : parseInt(formData.lifespan, 10);
    if (formData.lifespan === "custom" && (lifespanYears == null || isNaN(lifespanYears) || lifespanYears < 1)) {
      toast.error("Please enter a valid custom lifespan (1 or more years).");
      return;
    }
    const activationDate = formData.activationDate || undefined;
    const expirationDate = formData.expirationDate || undefined;
    const payload = {
      domainName: formData.domainName,
      notes: formData.notes || undefined,
      activationDate: activationDate || undefined,
      expirationDate: expirationDate || undefined,
      lifespanYears: lifespanYears ?? undefined,
      status: formData.status,
    };
    if (editingDomain) {
      await onUpdate(editingDomain.id, payload);
      onCancelEdit();
    } else {
      if (!formData.clientId) {
        toast.error("Client is required.");
        return;
      }
      await onSubmit({
        clientId: formData.clientId,
        domainName: formData.domainName,
        notes: payload.notes,
        activationDate: payload.activationDate,
        expirationDate: payload.expirationDate,
        lifespanYears: payload.lifespanYears,
        status: payload.status,
      });
      setFormData({
        clientId: "",
        domainName: "",
        notes: "",
        activationDate: "",
        expirationDate: "",
        lifespan: "1",
        customLifespanYears: "",
        status: "PENDING",
      });
    }
  };

  return (
    <div
      ref={formRef}
      className="mb-6 rounded-xl card-panel p-5 shadow-lg shadow-[var(--color-shadow)] transition"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-theme-primary">
          {editingDomain ? "Edit Domain" : "Add New Domain"}
        </h3>
      </div>
      {editingDomain && (editingDomain.activationEmailSentAt || editingDomain.renewalReminderSentAt) && (
        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          {editingDomain.activationEmailSentAt && (
            <p>Activation email sent on {new Date(editingDomain.activationEmailSentAt).toLocaleDateString()}</p>
          )}
          {editingDomain.renewalReminderSentAt && (
            <p>Renewal reminder sent on {new Date(editingDomain.renewalReminderSentAt).toLocaleDateString()}</p>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:items-end">
          {!editingDomain && (
            <div className="w-full">
              <label className={CONTROL_LABEL}>Client / Owner *</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className={CONTROL_SELECT}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full">
            <label className={CONTROL_LABEL}>Domain Name *</label>
            <input
              type="text"
              name="domainName"
              value={formData.domainName}
              onChange={handleChange}
              placeholder="example.com"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={CONTROL_SELECT}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Activation Date</label>
            <DatePicker
              value={formData.activationDate}
              onChange={(activationDate) => setFormData((prev) => ({ ...prev, activationDate }))}
              placeholder="yyyy/mm/dd"
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Domain Lifespan</label>
            <select
              name="lifespan"
              value={formData.lifespan}
              onChange={handleChange}
              className={CONTROL_SELECT}
            >
              {LIFESPAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {formData.lifespan === "custom" && (
            <div className="w-full">
              <label className={CONTROL_LABEL}>Custom (years)</label>
              <input
                type="number"
                name="customLifespanYears"
                min={1}
                value={formData.customLifespanYears}
                onChange={handleChange}
                placeholder="e.g. 5"
                className={CONTROL_INPUT}
              />
            </div>
          )}

          <div className="w-full md:items-end">
            <label className={CONTROL_LABEL}>Expiration Date</label>
            <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {formData.expirationDate ? formatDDMMYYYY(formData.expirationDate) : "—"}
              </span>
              {(() => {
                const years =
                  formData.lifespan === "custom"
                    ? formData.customLifespanYears ? parseInt(formData.customLifespanYears, 10) : 0
                    : parseInt(formData.lifespan, 10);
                const hasCalculation = formData.activationDate && years >= 1;
                if (!hasCalculation) {
                  return (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Set activation + lifespan
                    </span>
                  );
                }
                return (
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatDDMMYYYY(formData.activationDate)} + {years}y → {formatDDMMYYYY(formData.expirationDate || "")}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Notes / Internal Comments</label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes about this domain"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="btn-primary inline-flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold"
            >
              {editingDomain ? "Update" : "Add"} Domain
            </button>
            {editingDomain && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="btn-secondary inline-flex h-11 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DomainForm;
