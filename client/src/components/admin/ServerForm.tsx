import React, { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../ui/controls";
import DatePicker from "../ui/DatePicker";
import Button from "../ui/Button";

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

export interface ServerFormPayload {
  clientId: string;
  label: string;
  provider?: string;
  ipAddress?: string;
  plan?: string;
  location?: string;
  notes?: string;
  activationDate?: string;
  expirationDate?: string;
  lifespanYears?: number | null;
  price?: number | null;
  providerCost?: number | null;
  currency?: string;
  billingCycle?: string;
  status?: string;
}

interface ServerFormProps {
  onSubmit: (data: ServerFormPayload) => Promise<void>;
  onUpdate: (serverId: number, data: Omit<ServerFormPayload, "clientId">) => Promise<void>;
  clients: User[];
  editingServer: {
    id: number;
    label: string;
    provider?: string | null;
    ipAddress?: string | null;
    plan?: string | null;
    location?: string | null;
    notes?: string | null;
    clientId: number;
    activationDate?: string | null;
    expirationDate?: string | null;
    lifespanYears?: number | null;
    price?: number | null;
    providerCost?: number | null;
    currency?: string | null;
    billingCycle?: string | null;
    status?: string;
  } | null;
  onCancelEdit: () => void;
}

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "CAD", label: "CAD (CA$)" },
];

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

const EMPTY = {
  clientId: "",
  label: "",
  provider: "",
  ipAddress: "",
  plan: "",
  location: "",
  notes: "",
  activationDate: "",
  expirationDate: "",
  lifespan: "1",
  customLifespanYears: "" as string,
  price: "" as string,
  providerCost: "" as string,
  currency: "EUR",
  billingCycle: "YEARLY",
  status: "PENDING",
};

const ServerForm: React.FC<ServerFormProps> = ({ onSubmit, onUpdate, clients, editingServer, onCancelEdit }) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({ ...EMPTY });

  useEffect(() => {
    if (editingServer && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingServer]);

  useEffect(() => {
    if (editingServer) {
      setFormData({
        clientId: editingServer.clientId.toString(),
        label: editingServer.label,
        provider: editingServer.provider || "",
        ipAddress: editingServer.ipAddress || "",
        plan: editingServer.plan || "",
        location: editingServer.location || "",
        notes: editingServer.notes || "",
        activationDate: toDateInputValue(editingServer.activationDate),
        expirationDate: toDateInputValue(editingServer.expirationDate),
        lifespan:
          editingServer.lifespanYears === 2
            ? "2"
            : editingServer.lifespanYears === 3
              ? "3"
              : editingServer.lifespanYears === 1
                ? "1"
                : editingServer.lifespanYears == null
                  ? "1"
                  : "custom",
        customLifespanYears:
          editingServer.lifespanYears != null && ![1, 2, 3].includes(editingServer.lifespanYears)
            ? String(editingServer.lifespanYears)
            : "",
        price: editingServer.price != null ? String(editingServer.price) : "",
        providerCost: editingServer.providerCost != null ? String(editingServer.providerCost) : "",
        currency: editingServer.currency || "EUR",
        billingCycle: editingServer.billingCycle || "YEARLY",
        status: editingServer.status || "PENDING",
      });
    } else {
      setFormData({ ...EMPTY });
    }
  }, [editingServer]);

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
    if (!formData.label) {
      toast.error("Server label is required.");
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
    const parsePrice = (v: string): number | null => {
      const t = v.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const payload = {
      label: formData.label,
      provider: formData.provider || undefined,
      ipAddress: formData.ipAddress || undefined,
      plan: formData.plan || undefined,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
      activationDate: formData.activationDate || undefined,
      expirationDate: formData.expirationDate || undefined,
      lifespanYears: lifespanYears ?? undefined,
      price: parsePrice(formData.price),
      providerCost: parsePrice(formData.providerCost),
      currency: formData.currency,
      billingCycle: formData.billingCycle,
      status: formData.status,
    };
    if (editingServer) {
      await onUpdate(editingServer.id, payload);
      onCancelEdit();
    } else {
      if (!formData.clientId) {
        toast.error("Client is required.");
        return;
      }
      await onSubmit({ clientId: formData.clientId, ...payload });
      setFormData({ ...EMPTY });
    }
  };

  return (
    <div ref={formRef} className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
      <h3 className="section-title mb-4">{editingServer ? "Edit Server" : "Add New Server"}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:items-end">
          {!editingServer && (
            <div className="w-full">
              <label className={CONTROL_LABEL}>Client / Owner *</label>
              <select name="clientId" value={formData.clientId} onChange={handleChange} className={CONTROL_SELECT}>
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
            <label className={CONTROL_LABEL}>Server Label *</label>
            <input
              type="text"
              name="label"
              value={formData.label}
              onChange={handleChange}
              placeholder="e.g. Main VPS"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={CONTROL_SELECT}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Provider</label>
            <input
              type="text"
              name="provider"
              value={formData.provider}
              onChange={handleChange}
              placeholder="e.g. Hetzner"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>IP Address</label>
            <input
              type="text"
              name="ipAddress"
              value={formData.ipAddress}
              onChange={handleChange}
              placeholder="e.g. 65.21.10.4"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Plan / Specs</label>
            <input
              type="text"
              name="plan"
              value={formData.plan}
              onChange={handleChange}
              placeholder="e.g. CPX21 · 4 GB RAM"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Falkenstein, DE"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Activation Date</label>
            <DatePicker
              value={formData.activationDate}
              onChange={(activationDate) => setFormData((prev) => ({ ...prev, activationDate }))}
              placeholder="yyyy/mm/dd"
              usePortal
            />
          </div>

          {/* Lifespan: segmented pills */}
          <div className="w-full md:col-span-2 lg:col-span-2">
            <label className={CONTROL_LABEL}>Active For (lifespan)</label>
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="inline-flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                {LIFESPAN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, lifespan: opt.value }))}
                    aria-pressed={formData.lifespan === opt.value}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      formData.lifespan === opt.value
                        ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
            <label className={CONTROL_LABEL}>Expiration / Renewal Date</label>
            <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {formData.expirationDate ? formatDDMMYYYY(formData.expirationDate) : "—"}
              </span>
              {(() => {
                const years =
                  formData.lifespan === "custom"
                    ? formData.customLifespanYears
                      ? parseInt(formData.customLifespanYears, 10)
                      : 0
                    : parseInt(formData.lifespan, 10);
                const hasCalculation = formData.activationDate && years >= 1;
                if (!hasCalculation) {
                  return <span className="text-xs text-[var(--color-text-muted)]">Set activation + lifespan</span>;
                }
                return (
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatDDMMYYYY(formData.activationDate)} + {years}y → {formatDDMMYYYY(formData.expirationDate || "")}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Billing cycle: segmented pills */}
          <div className="w-full">
            <label className={CONTROL_LABEL}>Billing Cycle</label>
            <div className="inline-flex w-full gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
              {[
                { value: "MONTHLY", label: "Per month" },
                { value: "YEARLY", label: "Per year" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, billingCycle: opt.value }))}
                  aria-pressed={formData.billingCycle === opt.value}
                  className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    formData.billingCycle === opt.value
                      ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>
              Price to Client <span className="text-[var(--color-text-muted)]">/ {formData.billingCycle === "MONTHLY" ? "mo" : "yr"}</span>
            </label>
            <input
              type="number"
              name="price"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g. 120"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>
              Provider Cost <span className="text-[var(--color-text-muted)]">/ {formData.billingCycle === "MONTHLY" ? "mo" : "yr"}</span>
            </label>
            <input
              type="number"
              name="providerCost"
              min={0}
              step="0.01"
              value={formData.providerCost}
              onChange={handleChange}
              placeholder="e.g. 60"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Currency</label>
            <select name="currency" value={formData.currency} onChange={handleChange} className={CONTROL_SELECT}>
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:col-span-2 lg:col-span-3">
            <label className={CONTROL_LABEL}>Notes / Internal Comments</label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes about this server"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
            <Button type="submit" variant="primary" className="flex-1">
              {editingServer ? "Update" : "Add"} Server
            </Button>
            {editingServer && (
              <Button variant="secondary" onClick={onCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ServerForm;
