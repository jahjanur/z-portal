import { useMemo, useState } from "react";
import { Check, Link2, Clock, ShieldCheck, FileText, Layers } from "lucide-react";
import { formatMoney } from "../../utils/currency";

export interface SeoPackageFull {
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

// DA bands, high → low. Each backlink's DA is bucketed for a readable summary.
const BANDS = [
  { min: 90, max: 100, label: "DA 90–100", tone: "var(--color-success-text)" },
  { min: 80, max: 89, label: "DA 80–89", tone: "var(--color-success-text)" },
  { min: 70, max: 79, label: "DA 70–79", tone: "var(--color-info-text)" },
  { min: 60, max: 69, label: "DA 60–69", tone: "var(--color-info-text)" },
  { min: 50, max: 59, label: "DA 50–59", tone: "var(--color-warning-text)" },
  { min: 40, max: 49, label: "DA 40–49", tone: "var(--color-warning-text)" },
  { min: 0, max: 39, label: "DA 30–39", tone: "var(--color-text-muted)" },
];

export default function SeoPackageDetails({ pkg }: { pkg: SeoPackageFull }) {
  const [showAllDa, setShowAllDa] = useState(false);
  const profile = pkg.backlinkProfile ?? [];
  const totalLinks = useMemo(() => profile.reduce((s, x) => s + x.qty, 0), [profile]);

  const bands = useMemo(() => {
    const rows = BANDS.map((b) => ({
      ...b,
      qty: profile.filter((x) => x.da >= b.min && x.da <= b.max).reduce((s, x) => s + x.qty, 0),
    })).filter((b) => b.qty > 0);
    const max = Math.max(1, ...rows.map((r) => r.qty));
    return { rows, max };
  }, [profile]);

  const sortedDa = useMemo(() => [...profile].sort((a, b) => b.da - a.da), [profile]);

  return (
    <div className="space-y-5">
      {/* headline */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{pkg.name}</h3>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">{formatMoney(pkg.price, pkg.currency)}</span>
        </div>
        {pkg.positioning && <p className="text-sm text-[var(--color-text-muted)]">{pkg.positioning}</p>}
      </div>

      {/* key facts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact icon={<Link2 className="h-4 w-4" />} value={String(pkg.backlinks)} label="Backlinks" />
        <Fact icon={<Layers className="h-4 w-4" />} value={String(pkg.packageItems)} label="Package items" />
        <Fact icon={<FileText className="h-4 w-4" />} value={`${pkg.maxKeywords}`} label="Max keywords" />
        <Fact icon={<Clock className="h-4 w-4" />} value={`${pkg.deliveryDaysMin}–${pkg.deliveryDaysMax}`} label="Business days" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
        {pkg.processingHours ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {pkg.processingHours}h processing</span> : null}
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {pkg.guaranteeMonths}-month guarantee</span>
        <span>1 SEO-optimized article per keyword</span>
      </div>

      {/* highlights */}
      {(pkg.highlights?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">What's included</p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {pkg.highlights!.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success-text)]" strokeWidth={2.5} />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* content pieces */}
      {(pkg.contentPieces?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Content produced</p>
          <div className="flex flex-wrap gap-2">
            {pkg.contentPieces!.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]">
                <span className="rounded bg-[var(--color-surface-3)] px-1.5 font-bold text-[var(--color-text-primary)]">{c.qty}×</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* backlink DA profile */}
      {totalLinks > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Backlink authority profile</p>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{totalLinks} links</span>
          </div>
          <div className="space-y-1.5">
            {bands.rows.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-[var(--color-text-muted)]">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${(b.qty / bands.max) * 100}%`, background: b.tone }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">{b.qty}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAllDa((v) => !v)}
            className="mt-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
          >
            {showAllDa ? "Hide exact DA breakdown" : "Show exact DA breakdown"}
          </button>
          {showAllDa && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sortedDa.map((x, i) => (
                <span key={i} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
                  DA{x.da} <span className="font-bold text-[var(--color-text-primary)]">×{x.qty}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 text-center">
      <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">{icon}</span>
      <p className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
