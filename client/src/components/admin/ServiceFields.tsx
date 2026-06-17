import { useRef, useState } from "react";
import { Check, Plus, X, Eye, EyeOff, ExternalLink, Upload, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { SERVICE_TYPES, SMM_PLATFORMS, getServiceDef, summarizeService } from "../../utils/serviceTypes";
import type { ServiceType, FieldDef } from "../../utils/serviceTypes";
import API, { getFileUrl } from "../../api";

type Meta = Record<string, unknown>;

export interface LinkItem { label?: string; url: string; uploaded?: boolean; fileType?: string }
export interface CredItem { label?: string; username?: string; password?: string; url?: string }

const isImageAsset = (it: LinkItem): boolean =>
  it.fileType === "image" || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(it.url || "");

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const ADD_BTN =
  "flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]";

/* ---------------------------------------------------- type picker (cards) */
export function ServiceTypePicker({ value, onChange }: { value: string; onChange: (t: ServiceType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SERVICE_TYPES.map((s) => {
        const active = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition ${
              active
                ? "border-[var(--card-hover-border)] bg-[var(--color-surface-3)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-border-hover)]"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: active ? s.accent : "var(--color-surface-3)", color: active ? "#0b0f14" : s.accent }}>
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-bold text-[var(--color-text-primary)]">{s.label}</span>
            <span className="text-[11px] leading-tight text-[var(--color-text-muted)]">{s.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------- checklist editor */
interface ChecklistItem { label: string; done?: boolean }
function ChecklistEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (v: ChecklistItem[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...(items || []), { label: v, done: false }]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      {(items || []).length > 0 && (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5">
              <button type="button" onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${it.done ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "border-[var(--color-border-hover)] text-transparent"}`}>
                <Check className="h-3.5 w-3.5" />
              </button>
              <span className={`flex-1 text-sm ${it.done ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-secondary)]"}`}>{it.label}</span>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add an item…" className="w-full !py-1.5 text-sm" />
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- brand colors editor */
function ColorsEditor({ colors, onChange }: { colors: string[]; onChange: (v: string[]) => void }) {
  // Default to the Zulbera brand color so new projects start from it.
  const [draft, setDraft] = useState("#5B4FFF");
  const add = () => {
    let v = draft.trim();
    if (!v || v === "#") return;
    if (!v.startsWith("#")) v = "#" + v;
    onChange([...(colors || []), v]);
    setDraft("#");
  };
  const valid = /^#[0-9a-fA-F]{6}$/.test(draft);
  return (
    <div className="space-y-2">
      {colors?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colors.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] py-1 pl-1 pr-2">
              <span className="h-5 w-5 rounded-md border border-[var(--color-border)]" style={{ background: c }} />
              <span className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">{c}</span>
              <button type="button" onClick={() => onChange(colors.filter((_, j) => j !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="color" value={valid ? draft : "#000000"} onChange={(e) => setDraft(e.target.value)} aria-label="Pick color" className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-0.5" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="#FF5722 or brand hex" className="w-full !py-1.5 text-sm" />
        <button type="button" onClick={add} className={ADD_BTN}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- links / assets editor */
function LinksEditor({ items, onChange }: { items: LinkItem[]; onChange: (v: LinkItem[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (i: number, patch: Partial<LinkItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const added: LinkItem[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await API.post("/projects/assets", fd, { headers: { "Content-Type": undefined } });
        added.push({ label: data.fileName, url: data.url, uploaded: true, fileType: data.fileType });
      }
      onChange([...(items || []), ...added]);
    } catch {
      toast.error("Upload failed — file may be too large (max 25 MB)");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {(items || []).map((it, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2 sm:flex-row sm:items-center">
          {it.uploaded ? (
            <>
              {isImageAsset(it) ? (
                <img src={getFileUrl(it.url)} alt="" className="h-10 w-10 shrink-0 rounded-md border border-[var(--color-border)] object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"><Paperclip className="h-4 w-4" /></span>
              )}
              <input value={it.label || ""} onChange={(e) => update(i, { label: e.target.value })} placeholder="Name" className="w-full !py-1.5 text-sm" />
              <a href={getFileUrl(it.url)} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-[var(--color-info-text)] hover:underline">view</a>
            </>
          ) : (
            <>
              <input value={it.label || ""} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label (Logo, Figma, Drive…)" className="w-full !py-1.5 text-sm sm:w-48" />
              <input value={it.url || ""} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://…" className="w-full !py-1.5 text-sm" />
            </>
          )}
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="self-end text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)] sm:self-center"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([...(items || []), { label: "", url: "" }])} className={ADD_BTN}><Plus className="h-4 w-4" /> Add link</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${ADD_BTN} disabled:opacity-60`}>
          <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload files"}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files); if (e.target) e.target.value = ""; }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------- credentials editor */
function CredentialsEditor({ items, onChange }: { items: CredItem[]; onChange: (v: CredItem[]) => void }) {
  const [show, setShow] = useState<Record<number, boolean>>({});
  const update = (i: number, patch: Partial<CredItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--color-text-muted)]">Stored as plain text so your team can access it — avoid keeping critical/banking secrets here.</p>
      {(items || []).map((it, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
          <div className="flex items-center gap-2">
            <input value={it.label || ""} onChange={(e) => update(i, { label: e.target.value })} placeholder="Service (Hosting, CMS, cPanel, DB…)" className="w-full !py-1.5 text-sm font-medium" />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={it.username || ""} onChange={(e) => update(i, { username: e.target.value })} placeholder="Username / email" className="w-full !py-1.5 text-sm" autoComplete="off" />
            <div className="relative">
              <input type={show[i] ? "text" : "password"} value={it.password || ""} onChange={(e) => update(i, { password: e.target.value })} placeholder="Password" className="w-full !py-1.5 !pr-9 text-sm" autoComplete="off" />
              <button type="button" onClick={() => setShow((s) => ({ ...s, [i]: !s[i] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label={show[i] ? "Hide password" : "Show password"}>
                {show[i] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <input value={it.url || ""} onChange={(e) => update(i, { url: e.target.value })} placeholder="Login URL (optional)" className="w-full !py-1.5 text-sm" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...(items || []), { label: "", username: "", password: "", url: "" }])} className={ADD_BTN}><Plus className="h-4 w-4" /> Add login</button>
    </div>
  );
}

/* ---------------------------------------------------- one field */
function Field({ def, meta, onChange }: { def: FieldDef; meta: Meta; onChange: (k: string, v: unknown) => void }) {
  const val = meta[def.key];
  if (def.type === "platforms") {
    const sel = Array.isArray(val) ? (val as string[]) : [];
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <div className="flex flex-wrap gap-2">
          {SMM_PLATFORMS.map((pl) => {
            const on = sel.includes(pl);
            return (
              <button key={pl} type="button"
                onClick={() => onChange(def.key, on ? sel.filter((x) => x !== pl) : [...sel, pl])}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-[var(--card-hover-border)] bg-[var(--color-surface-3)] text-[var(--color-text-primary)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>
                {pl}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (def.type === "checklist") {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <ChecklistEditor items={(Array.isArray(val) ? val : []) as ChecklistItem[]} onChange={(v) => onChange(def.key, v)} />
      </div>
    );
  }
  if (def.type === "colors") {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <ColorsEditor colors={asArray<string>(val)} onChange={(v) => onChange(def.key, v)} />
      </div>
    );
  }
  if (def.type === "links") {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <LinksEditor items={asArray<LinkItem>(val)} onChange={(v) => onChange(def.key, v)} />
      </div>
    );
  }
  if (def.type === "credentials") {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <CredentialsEditor items={asArray<CredItem>(val)} onChange={(v) => onChange(def.key, v)} />
      </div>
    );
  }
  if (def.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
        <textarea
          value={(val as string | undefined) ?? ""}
          onChange={(e) => onChange(def.key, e.target.value)}
          placeholder={def.placeholder}
          rows={3}
          className="w-full resize-y text-sm"
        />
      </div>
    );
  }
  const isMoney = def.type === "money";
  const inputType = def.type === "number" || isMoney ? "number" : def.type === "date" ? "date" : def.type === "url" ? "url" : "text";
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">{def.label}</label>
      <div className="relative">
        {isMoney && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>}
        <input
          type={inputType}
          value={(val as string | number | undefined) ?? ""}
          onChange={(e) => onChange(def.key, inputType === "number" ? e.target.value : e.target.value)}
          placeholder={def.placeholder}
          className={`w-full ${isMoney ? "!pl-7" : ""}`}
          min={inputType === "number" ? 0 : undefined}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------- dynamic fields form */
export function ServiceFieldsForm({ serviceType, metadata, onChange }: { serviceType: string; metadata: Meta; onChange: (m: Meta) => void }) {
  const def = getServiceDef(serviceType);
  if (def.fields.length === 0) return null;
  const set = (k: string, v: unknown) => onChange({ ...metadata, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {def.fields.map((f) => <Field key={f.key} def={f} meta={metadata} onChange={set} />)}
    </div>
  );
}

/* ---------------------------------------------------- badge + summary (display) */
export function ServiceBadge({ serviceType }: { serviceType?: string }) {
  const def = getServiceDef(serviceType);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold" style={{ borderColor: def.accent + "55", color: def.accent }}>
      <def.icon className="h-3 w-3" /> {def.label}
    </span>
  );
}

/* ---------------------------------------------------- read-only views (detail page) */
export function ColorsView({ colors }: { colors: string[] }) {
  if (!colors?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] py-1 pl-1 pr-2">
          <span className="h-5 w-5 rounded-md border border-[var(--color-border)]" style={{ background: c }} />
          <span className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">{c}</span>
        </span>
      ))}
    </div>
  );
}

export function LinksView({ items }: { items: LinkItem[] }) {
  const valid = (items || []).filter((l) => l.url);
  if (!valid.length) return null;
  const images = valid.filter(isImageAsset);
  const others = valid.filter((l) => !isImageAsset(l));
  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((l, i) => (
            <a key={i} href={getFileUrl(l.url)} target="_blank" rel="noreferrer" title={l.label?.trim() || ""} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <img src={getFileUrl(l.url)} alt={l.label?.trim() || ""} className="h-full w-full object-cover transition group-hover:scale-105" />
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((l, i) => (
            <a key={i} href={getFileUrl(l.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]">
              {l.uploaded ? <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" /> : null}
              {l.label?.trim() || l.url}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialRow({ item }: { item: CredItem }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label?.trim() || "Login"}</span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-info-text)] hover:underline">Open <ExternalLink className="h-3 w-3" /></a>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {item.username && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">User</span>
            <span className="truncate font-medium text-[var(--color-text-secondary)]">{item.username}</span>
          </div>
        )}
        {item.password && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">Pass</span>
            <span className="truncate font-mono text-[var(--color-text-secondary)]">{show ? item.password : "••••••••"}</span>
            <button type="button" onClick={() => setShow((s) => !s)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CredentialsView({ items }: { items: CredItem[] }) {
  const valid = (items || []).filter((c) => c.label || c.username || c.password || c.url);
  if (!valid.length) return null;
  return (
    <div className="space-y-2">
      {valid.map((c, i) => <CredentialRow key={i} item={c} />)}
    </div>
  );
}

export function ServiceSummaryView({ serviceType, metadata }: { serviceType?: string; metadata?: Meta | null }) {
  const def = getServiceDef(serviceType);
  const sum = summarizeService(serviceType, metadata);
  if (sum.progress === null && sum.stats.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {sum.progress !== null && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
            <span>{sum.progressLabel ?? "Progress"}</span>
            <span className="font-semibold text-[var(--color-text-secondary)]">{sum.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
            <div className="h-full rounded-full transition-all" style={{ width: `${sum.progress}%`, background: def.accent }} />
          </div>
        </div>
      )}
      {sum.stats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sum.stats.map((s, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
              s.tone === "danger" ? "border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)]"
              : s.tone === "success" ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"}`}>
              <span className="text-[var(--color-text-muted)]">{s.label}</span>
              <span className="font-semibold">{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
