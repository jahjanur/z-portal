import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, Check, Link2, Globe, Clock, ShieldCheck, Pencil, ListChecks } from "lucide-react";
import API from "../../api";
import { formatMoney } from "../../utils/currency";
import Modal from "../ui/Modal";
import SeoPackageDetails from "../seo/SeoPackageDetails";

export interface SeoPackageLite {
  id: number;
  name: string;
  positioning?: string | null;
  price: number;
  currency?: string;
  features?: string[];
  highlights?: string[];
  backlinks: number;
  packageItems: number;
  maxKeywords: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  processingHours?: number;
  guaranteeMonths: number;
  contentPieces?: { qty: number; label: string }[] | null;
  backlinkProfile?: { da: number; qty: number }[] | null;
}

export interface SeoOrder {
  id: number;
  status: string;
  websiteUrl?: string | null;
  sector?: string | null;
  language?: string | null;
  chooseLinks?: boolean;
  keywords?: { keyword: string; targetUrl?: string | null }[] | null;
  note?: string | null;
  package: SeoPackageLite;
}

const STAGES = [
  { key: "AWAITING_INFO", label: "Awaiting info" },
  { key: "INFO_RECEIVED", label: "Info received" },
  { key: "SENT_TO_PROVIDER", label: "Sent to team" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "DELIVERED", label: "Delivered" },
];
const ALL_STATUSES = [...STAGES.map((s) => s.key), "CANCELLED"];

const STATUS_LABEL: Record<string, string> = {
  AWAITING_INFO: "Awaiting info",
  INFO_RECEIVED: "Info received",
  SENT_TO_PROVIDER: "Sent to team",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

interface Props {
  order: SeoOrder;
  isAdmin: boolean;
  /** Admin, or the owning client while the order isn't locked. */
  canEdit: boolean;
  onChanged: () => void;
}

export default function SeoPanel({ order, isAdmin, canEdit, onChanged }: Props) {
  const pkg = order.package;
  const locked = ["SENT_TO_PROVIDER", "IN_PROGRESS", "DELIVERED", "CANCELLED"].includes(order.status);
  const hasIntake = !!order.websiteUrl && (order.keywords?.length ?? 0) > 0;
  const currentStageIdx = STAGES.findIndex((s) => s.key === order.status);

  const [editing, setEditing] = useState(!hasIntake && canEdit && !locked);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const setStatus = async (status: string) => {
    setSavingStatus(true);
    try {
      await API.patch(`/seo/orders/${order.id}`, { status });
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't update status");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="card-panel p-4 sm:p-5">
      {/* header */}
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">SEO campaign</h3>
        <span className="ml-auto rounded-full bg-[var(--color-surface-3)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-text-secondary)]">{pkg.name}</span>
      </div>

      {/* package summary */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
        {pkg.positioning && <p className="text-xs text-[var(--color-text-muted)]">{pkg.positioning}</p>}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <Stat icon={<Link2 className="h-3.5 w-3.5" />} label="Backlinks" value={String(pkg.backlinks)} />
          <Stat icon={<Search className="h-3.5 w-3.5" />} label="Max keywords" value={String(pkg.maxKeywords)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Delivery" value={`${pkg.deliveryDaysMin}–${pkg.deliveryDaysMax} days`} />
          <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Guarantee" value={`${pkg.guaranteeMonths} months`} />
        </div>
        <p className="mt-2 text-sm font-bold text-[var(--color-text-primary)]">{formatMoney(pkg.price, pkg.currency)}</p>
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
        >
          <ListChecks className="h-3.5 w-3.5" /> See what's included
        </button>
      </div>

      {/* status stepper */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Progress</p>
          {order.status === "CANCELLED" && (
            <span className="rounded-full bg-[var(--color-destructive-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-destructive-text)]">Cancelled</span>
          )}
        </div>
        <ol className="space-y-1.5">
          {STAGES.map((s, i) => {
            const done = order.status !== "CANCELLED" && i < currentStageIdx;
            const active = s.key === order.status;
            return (
              <li key={s.key} className="flex items-center gap-2.5 text-sm">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  done ? "border-[var(--color-success-text)] bg-[var(--color-success-text)] text-white"
                  : active ? "border-[var(--color-focus-ring)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-border-hover)] text-transparent"}`}>
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={active ? "font-semibold text-[var(--color-text-primary)]" : done ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"}>{s.label}</span>
              </li>
            );
          })}
        </ol>
        {isAdmin && (
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-muted)]">Set status</label>
            <select
              value={order.status}
              disabled={savingStatus}
              onChange={(e) => setStatus(e.target.value)}
              className="input-dark w-full px-3 py-2 text-sm"
            >
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* intake */}
      <div className="mt-4 border-t border-[var(--color-border)] pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Order details</p>
          {hasIntake && canEdit && !locked && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <IntakeForm order={order} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />
        ) : hasIntake ? (
          <ReadOnlyIntake order={order} />
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--color-border-hover)] py-4 text-center text-xs text-[var(--color-text-muted)]">
            {canEdit ? "Add your website and keywords to start the campaign." : "Waiting for the client to submit their website and keywords."}
          </p>
        )}
      </div>

      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`${pkg.name} — what's included`} maxWidth="lg">
        <SeoPackageDetails pkg={pkg} />
      </Modal>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <span className="text-[var(--color-text-muted)]">{label}:</span>
      <span className="font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

function ReadOnlyIntake({ order }: { order: SeoOrder }) {
  return (
    <div className="space-y-2 text-sm">
      <Row icon={<Globe className="h-3.5 w-3.5" />} label="Website">
        {order.websiteUrl ? <a href={order.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-primary)] underline-offset-2 hover:underline">{order.websiteUrl}</a> : "—"}
      </Row>
      {order.sector && <Row label="Sector">{order.sector}</Row>}
      {order.language && <Row label="Language">{order.language}</Row>}
      <div>
        <p className="mb-1 text-xs text-[var(--color-text-muted)]">Keywords</p>
        <div className="space-y-1">
          {(order.keywords ?? []).map((k, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-text-primary)]">{k.keyword}</span>
              {k.targetUrl && <a href={k.targetUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"><Link2 className="inline h-3.5 w-3.5" /></a>}
            </div>
          ))}
        </div>
      </div>
      {order.note && <Row label="Note">{order.note}</Row>}
    </div>
  );
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">{icon}{label}:</span>
      <span className="min-w-0 break-words text-[var(--color-text-secondary)]">{children}</span>
    </div>
  );
}

function IntakeForm({ order, onCancel, onSaved }: { order: SeoOrder; onCancel: () => void; onSaved: () => void }) {
  const max = order.package.maxKeywords;
  const [websiteUrl, setWebsiteUrl] = useState(order.websiteUrl ?? "");
  const [sector, setSector] = useState(order.sector ?? "");
  const [language, setLanguage] = useState(order.language ?? "Turkish");
  const [chooseLinks, setChooseLinks] = useState(order.chooseLinks ?? false);
  const [note, setNote] = useState(order.note ?? "");
  const initialKw = useMemo(() => {
    const arr = (order.keywords ?? []).map((k) => ({ keyword: k.keyword, targetUrl: k.targetUrl ?? "" }));
    while (arr.length < max) arr.push({ keyword: "", targetUrl: "" });
    return arr.slice(0, max);
  }, [order.keywords, max]);
  const [keywords, setKeywords] = useState(initialKw);
  const [saving, setSaving] = useState(false);

  const setKw = (i: number, field: "keyword" | "targetUrl", value: string) =>
    setKeywords((prev) => prev.map((k, idx) => (idx === i ? { ...k, [field]: value } : k)));

  const submit = async () => {
    if (!websiteUrl.trim()) { toast.error("Website URL is required"); return; }
    const cleaned = keywords.map((k) => ({ keyword: k.keyword.trim(), targetUrl: chooseLinks ? k.targetUrl.trim() || null : null })).filter((k) => k.keyword);
    if (cleaned.length === 0) { toast.error("Add at least one keyword"); return; }
    setSaving(true);
    try {
      await API.patch(`/seo/orders/${order.id}`, { websiteUrl: websiteUrl.trim(), sector: sector.trim(), language: language.trim(), chooseLinks, note: note.trim(), keywords: cleaned });
      toast.success("Order details saved");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't save details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Website URL *</label>
        <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="input-dark w-full px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Business sector</label>
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Legal, E-commerce" className="input-dark w-full px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Content language</label>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} className="input-dark w-full px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <input type="checkbox" checked={chooseLinks} onChange={(e) => setChooseLinks(e.target.checked)} className="accent-[var(--color-focus-ring)]" />
        I'll choose the target links myself
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Target keywords (up to {max})</label>
        <div className="space-y-2">
          {keywords.map((k, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-center text-xs font-semibold text-[var(--color-text-muted)]">{i + 1}</span>
                <input value={k.keyword} onChange={(e) => setKw(i, "keyword", e.target.value)} placeholder={i === 0 ? "Primary keyword *" : "Keyword (optional)"} className="input-dark w-full px-3 py-2 text-sm" />
              </div>
              {chooseLinks && (
                <div className="flex items-center gap-2">
                  <span className="w-4 shrink-0" />
                  <input value={k.targetUrl} onChange={(e) => setKw(i, "targetUrl", e.target.value)} placeholder="Target link for this keyword" className="input-dark w-full px-3 py-1.5 text-xs" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Order note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anchor-text preferences, pages to avoid…" className="input-dark w-full resize-y px-3 py-2 text-sm" />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
        <button type="button" onClick={submit} disabled={saving} className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50">
          {saving ? "Saving…" : "Save details"}
        </button>
      </div>
    </div>
  );
}
