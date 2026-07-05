import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Link2, Clock, Sparkles, Trash2, Pencil, Power, PlusCircle, ExternalLink } from "lucide-react";
import API from "../../api";
import { useAdmin } from "../../contexts/AdminContext";
import { formatMoney } from "../../utils/currency";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SeoPackageDetails from "../../components/seo/SeoPackageDetails";

interface DaLine { da: number; qty: number }
interface ContentPiece { qty: number; label: string }
interface SeoPackage {
  id: number; name: string; positioning?: string | null; active: boolean; sortOrder: number;
  price: number; currency: string; features: string[]; highlights: string[];
  providerName?: string | null; providerPackage?: string | null; providerCost?: number | null; providerListPrice?: number | null;
  backlinks: number; packageItems: number; maxKeywords: number; deliveryDaysMin: number; deliveryDaysMax: number;
  processingHours: number; guaranteeMonths: number; contentPieces?: ContentPiece[] | null; backlinkProfile?: DaLine[] | null;
}
interface SeoOrder {
  id: number; status: string; createdAt: string; taskId?: number | null;
  package: { name: string; price: number; currency: string; backlinks: number };
  client?: { id: number; name: string; company?: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  AWAITING_INFO: "Awaiting info", INFO_RECEIVED: "Info received", SENT_TO_PROVIDER: "Sent to team",
  IN_PROGRESS: "In progress", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
const ALL_STATUSES = Object.keys(STATUS_LABEL);

const serializeProfile = (p?: DaLine[] | null) => (p ?? []).map((x) => `${x.da}x${x.qty}`).join(", ");
const parseProfile = (s: string): DaLine[] =>
  s.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [da, qty] = part.split("x").map((n) => Number(n.trim()));
    return { da, qty };
  }).filter((x) => Number.isFinite(x.da) && Number.isFinite(x.qty));
const serializePieces = (p?: ContentPiece[] | null) => (p ?? []).map((x) => `${x.qty} x ${x.label}`).join("\n");
const parsePieces = (s: string): ContentPiece[] =>
  s.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d+)\s*x\s*(.+)$/i);
    return m ? { qty: Number(m[1]), label: m[2].trim() } : { qty: 1, label: l };
  });

export default function AdminSeoPage() {
  const navigate = useNavigate();
  const { adminOwnClients, adminOwnPendingInvoices, adminOwnPaidInvoices } = useAdmin();
  const [packages, setPackages] = useState<SeoPackage[]>([]);
  const [orders, setOrders] = useState<SeoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activatePkg, setActivatePkg] = useState<SeoPackage | null>(null);
  const [editPkg, setEditPkg] = useState<SeoPackage | null>(null);
  const [detailsPkg, setDetailsPkg] = useState<SeoPackage | null>(null);

  const allInvoices = useMemo(() => [...adminOwnPendingInvoices, ...adminOwnPaidInvoices], [adminOwnPendingInvoices, adminOwnPaidInvoices]);

  const load = async () => {
    try {
      const [pkgRes, orderRes] = await Promise.all([API.get("/seo/packages"), API.get("/seo/orders")]);
      setPackages(pkgRes.data);
      setOrders(orderRes.data);
    } catch {
      toast.error("Couldn't load SEO catalog");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const { data } = await API.post("/seo/packages/seed-defaults");
      const parts = [];
      if (data.created) parts.push(`${data.created} added`);
      if (data.updated) parts.push(`${data.updated} refreshed`);
      toast.success(parts.length ? `Catalog: ${parts.join(", ")}` : "Catalog is up to date");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't load defaults");
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (pkg: SeoPackage) => {
    try {
      await API.put(`/seo/packages/${pkg.id}`, { active: !pkg.active });
      load();
    } catch { toast.error("Couldn't update package"); }
  };
  const deletePkg = async (pkg: SeoPackage) => {
    if (!confirm(`Delete the ${pkg.name} package?`)) return;
    try {
      await API.delete(`/seo/packages/${pkg.id}`);
      toast.success("Package deleted");
      load();
    } catch (err: any) { toast.error(err?.response?.data?.error ?? "Couldn't delete"); }
  };
  const setOrderStatus = async (order: SeoOrder, status: string) => {
    try {
      await API.patch(`/seo/orders/${order.id}`, { status });
      load();
    } catch { toast.error("Couldn't update status"); }
  };
  const deleteOrder = async (order: SeoOrder) => {
    if (!confirm(`Delete this ${order.package.name} order? The linked task is removed too.`)) return;
    try {
      await API.delete(`/seo/orders/${order.id}`);
      toast.success("Order deleted");
      load();
    } catch { toast.error("Couldn't delete order"); }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
      <PageHeader title="SEO packages" subtitle="Manage the backlink catalog and activate campaigns for clients">
        <div className="flex flex-wrap gap-2">
          {packages.length > 0 && (
            <Button variant="secondary" loading={seeding} onClick={seedDefaults}>
              <Sparkles className="h-4 w-4" /> Reset to defaults
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditPkg({} as SeoPackage)}>
            <PlusCircle className="h-4 w-4" /> New package
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">Loading…</div>
      ) : (
        <>
          {/* Packages */}
          <section className="space-y-4">
            <h3 className="section-title">Catalog <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">({packages.length})</span></h3>
            {packages.length === 0 ? (
              <div className="card-panel rounded-2xl p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No packages yet. Load the four default tiers (Core, Growth, Authority, Apex) to get started.</p>
                <Button variant="primary" className="mt-4" loading={seeding} onClick={seedDefaults}>Load default catalog</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className={`card-panel flex flex-col rounded-2xl p-4 ${pkg.active ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-[var(--color-text-primary)]">{pkg.name}</h4>
                      {!pkg.active && <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Off</span>}
                    </div>
                    {pkg.positioning && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{pkg.positioning}</p>}
                    <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{formatMoney(pkg.price, pkg.currency)}</p>
                    {pkg.providerCost != null && (
                      <p className="text-[11px] text-[var(--color-text-muted)]">cost ₺{pkg.providerCost.toLocaleString()} · margin {formatMoney(pkg.price - (pkg.providerCost / 35), pkg.currency)}*</p>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-[var(--color-text-secondary)]">
                      <p className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> {pkg.backlinks} backlinks · {pkg.maxKeywords} keywords</p>
                      <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> {pkg.deliveryDaysMin}–{pkg.deliveryDaysMax} business days</p>
                    </div>
                    <ul className="mt-3 flex-1 space-y-1">
                      {(pkg.features ?? []).slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)]"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />{f}</li>
                      ))}
                    </ul>
                    <button onClick={() => setDetailsPkg(pkg)} className="mt-3 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]">See what's included →</button>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button variant="primary" size="sm" className="flex-1" onClick={() => setActivatePkg(pkg)}>Activate</Button>
                      <button onClick={() => setEditPkg(pkg)} title="Edit" className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggleActive(pkg)} title={pkg.active ? "Deactivate" : "Activate"} className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"><Power className="h-4 w-4" /></button>
                      <button onClick={() => deletePkg(pkg)} title="Delete" className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {packages.some((p) => p.providerCost != null) && <p className="text-[11px] text-[var(--color-text-muted)]">*margin is indicative (₺→€ ~35); adjust the rate on the Currency page.</p>}
          </section>

          {/* Orders */}
          <section className="space-y-4">
            <h3 className="section-title">Active orders <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">({orders.length})</span></h3>
            {orders.length === 0 ? (
              <EmptyState compact title="No SEO orders yet" description="Activate a package for a client to create their campaign." />
            ) : (
              <div className="stagger-children space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="card-panel row-hover flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-primary)]">{o.package.name}</span>
                        <StatusBadge status={o.status === "DELIVERED" ? "PAID" : o.status === "CANCELLED" ? "OVERDUE" : "PENDING"}>{STATUS_LABEL[o.status] ?? o.status}</StatusBadge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
                        {o.client?.name ?? `Client #${o.client?.id}`}{o.client?.company ? ` · ${o.client.company}` : ""} · {formatMoney(o.package.price, o.package.currency)} · {o.package.backlinks} backlinks
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <select value={o.status} onChange={(e) => setOrderStatus(o, e.target.value)} className="input-dark px-2.5 py-1.5 text-xs">
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      {o.taskId && (
                        <button onClick={() => navigate(`/tasks/${o.taskId}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]">
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </button>
                      )}
                      <button onClick={() => deleteOrder(o)} title="Delete" className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activatePkg && (
        <ActivateModal
          pkg={activatePkg}
          clients={adminOwnClients}
          invoices={allInvoices}
          onClose={() => setActivatePkg(null)}
          onDone={() => { setActivatePkg(null); load(); }}
        />
      )}
      {editPkg && (
        <PackageModal
          pkg={editPkg.id ? editPkg : null}
          onClose={() => setEditPkg(null)}
          onDone={() => { setEditPkg(null); load(); }}
        />
      )}
      {detailsPkg && (
        <Modal isOpen onClose={() => setDetailsPkg(null)} title={`${detailsPkg.name} — what's included`} maxWidth="lg">
          <SeoPackageDetails pkg={detailsPkg} />
        </Modal>
      )}
    </div>
  );
}

function ActivateModal({ pkg, clients, invoices, onClose, onDone }: {
  pkg: SeoPackage;
  clients: { id: number; name: string; company?: string | null }[];
  invoices: { id: number; invoiceNumber: string; clientId: number; amount: number; currency?: string }[];
  onClose: () => void; onDone: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [saving, setSaving] = useState(false);
  const clientInvoices = invoices.filter((i) => String(i.clientId) === clientId);

  const submit = async () => {
    if (!clientId) { toast.error("Select a client"); return; }
    setSaving(true);
    try {
      await API.post("/seo/orders", { packageId: pkg.id, clientId: Number(clientId), invoiceId: invoiceId ? Number(invoiceId) : undefined });
      toast.success(`${pkg.name} activated — the client can now add their keywords`);
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't activate");
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Activate ${pkg.name}`} maxWidth="md">
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-sm">
          <p className="font-bold text-[var(--color-text-primary)]">{formatMoney(pkg.price, pkg.currency)} · {pkg.backlinks} backlinks · up to {pkg.maxKeywords} keywords</p>
          <p className="text-xs text-[var(--color-text-muted)]">Creates an SEO task for the client and asks them for their website + keywords.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Client *</label>
          <select value={clientId} onChange={(e) => { setClientId(e.target.value); setInvoiceId(""); }} className="input-dark w-full px-3 py-2 text-sm">
            <option value="">Select a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Link an invoice (optional)</label>
          <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={!clientId} className="input-dark w-full px-3 py-2 text-sm disabled:opacity-50">
            <option value="">No invoice</option>
            {clientInvoices.map((i) => <option key={i.id} value={i.id}>#{i.invoiceNumber} · {formatMoney(i.amount, i.currency)}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Activate</Button>
        </div>
      </div>
    </Modal>
  );
}

function PackageModal({ pkg, onClose, onDone }: { pkg: SeoPackage | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name: pkg?.name ?? "", positioning: pkg?.positioning ?? "", price: String(pkg?.price ?? ""), currency: pkg?.currency ?? "EUR",
    backlinks: String(pkg?.backlinks ?? ""), packageItems: String(pkg?.packageItems ?? ""), maxKeywords: String(pkg?.maxKeywords ?? ""),
    deliveryDaysMin: String(pkg?.deliveryDaysMin ?? ""), deliveryDaysMax: String(pkg?.deliveryDaysMax ?? ""),
    guaranteeMonths: String(pkg?.guaranteeMonths ?? "12"), processingHours: String(pkg?.processingHours ?? "24"), sortOrder: String(pkg?.sortOrder ?? "0"),
    providerName: pkg?.providerName ?? "", providerPackage: pkg?.providerPackage ?? "", providerCost: String(pkg?.providerCost ?? ""), providerListPrice: String(pkg?.providerListPrice ?? ""),
    features: (pkg?.features ?? []).join("\n"), highlights: (pkg?.highlights ?? []).join("\n"),
    contentPieces: serializePieces(pkg?.contentPieces), backlinkProfile: serializeProfile(pkg?.backlinkProfile),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!f.name.trim() || !f.price) { toast.error("Name and price are required"); return; }
    const body = {
      name: f.name.trim(), positioning: f.positioning.trim() || null, price: Number(f.price), currency: f.currency,
      backlinks: Number(f.backlinks), packageItems: Number(f.packageItems), maxKeywords: Number(f.maxKeywords),
      deliveryDaysMin: Number(f.deliveryDaysMin), deliveryDaysMax: Number(f.deliveryDaysMax),
      guaranteeMonths: Number(f.guaranteeMonths), processingHours: Number(f.processingHours), sortOrder: Number(f.sortOrder),
      providerName: f.providerName.trim() || null, providerPackage: f.providerPackage.trim() || null,
      providerCost: f.providerCost ? Number(f.providerCost) : null, providerListPrice: f.providerListPrice ? Number(f.providerListPrice) : null,
      features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
      highlights: f.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
      contentPieces: parsePieces(f.contentPieces), backlinkProfile: parseProfile(f.backlinkProfile),
    };
    setSaving(true);
    try {
      if (pkg) await API.put(`/seo/packages/${pkg.id}`, body);
      else await API.post("/seo/packages", body);
      toast.success(pkg ? "Package updated" : "Package created");
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't save package");
    } finally { setSaving(false); }
  };

  const Text = ({ k, label, ph }: { k: keyof typeof f; label: string; ph?: string }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="input-dark w-full px-3 py-2 text-sm" />
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title={pkg ? `Edit ${pkg.name}` : "New package"} maxWidth="2xl">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Text k="name" label="Name *" ph="Core" />
          <Text k="positioning" label="Positioning" ph="Low + Medium competition" />
          <Text k="price" label="Price (client) *" />
          <Text k="currency" label="Currency" />
          <Text k="backlinks" label="Backlinks" />
          <Text k="packageItems" label="Package items" />
          <Text k="maxKeywords" label="Max keywords" />
          <Text k="sortOrder" label="Sort order" />
          <Text k="deliveryDaysMin" label="Delivery days min" />
          <Text k="deliveryDaysMax" label="Delivery days max" />
          <Text k="guaranteeMonths" label="Guarantee (months)" />
          <Text k="processingHours" label="Processing (hours)" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Text k="providerName" label="Provider" ph="Upstream provider" />
          <Text k="providerPackage" label="Provider package" ph="Altin" />
          <Text k="providerCost" label="Provider cost (₺)" />
          <Text k="providerListPrice" label="Provider list (₺)" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Client-facing features (one per line)</label>
          <textarea value={f.features} onChange={(e) => set("features", e.target.value)} rows={3} className="input-dark w-full resize-y px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Highlights (one per line)</label>
          <textarea value={f.highlights} onChange={(e) => set("highlights", e.target.value)} rows={3} className="input-dark w-full resize-y px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Content pieces (one per line, "4 x News promo article")</label>
          <textarea value={f.contentPieces} onChange={(e) => set("contentPieces", e.target.value)} rows={3} className="input-dark w-full resize-y px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Backlink profile (DAxqty, comma-separated: "99x2, 96x1, …")</label>
          <textarea value={f.backlinkProfile} onChange={(e) => set("backlinkProfile", e.target.value)} rows={3} className="input-dark w-full resize-y px-3 py-2 text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>{pkg ? "Save changes" : "Create package"}</Button>
        </div>
      </div>
    </Modal>
  );
}
