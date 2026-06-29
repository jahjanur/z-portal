import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus, Trash2, ImagePlus, Flag, X, ChevronRight } from "lucide-react";
import API, { getFileUrl } from "../../api";
import Modal from "../ui/Modal";
import ProgressBar from "../ui/ProgressBar";
import { type Milestone, milestoneProgress, milestoneImages } from "../../utils/milestones";

interface Props {
  taskId: number;
  milestones?: Milestone[] | null;
  /** Admin or assigned worker — may tick to-dos done. */
  canComplete: boolean;
  currentUserId: number;
  isAdmin: boolean;
  onChanged: () => void;
}

export default function MilestonesPanel({ taskId, milestones, canComplete, currentUserId, isAdmin, onChanged }: Props) {
  const list = milestones ?? [];
  const { total, done, percent } = milestoneProgress(list);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = openId != null ? list.find((m) => m.id === openId) ?? null : null;

  const resetForm = () => {
    setTitle(""); setDescription(""); setImages([]); setAdding(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      images.forEach((f) => fd.append("images", f));
      await API.post(`/tasks/${taskId}/milestones`, fd);
      resetForm();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't add to-do");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (m: Milestone) => {
    if (!canComplete) return;
    setTogglingId(m.id);
    try {
      await API.patch(`/tasks/${taskId}/milestones/${m.id}`, { isDone: !m.isDone });
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't update to-do");
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (m: Milestone) => {
    if (!window.confirm("Delete this to-do?")) return;
    try {
      await API.delete(`/tasks/${taskId}/milestones/${m.id}`);
      setOpenId(null);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't delete to-do");
    }
  };

  return (
    <div className="card-panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Flag className="h-4 w-4 text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-bold">To-dos</h3>
          {total > 0 && <span className="text-xs font-medium text-[var(--color-text-muted)]">{done}/{total}</span>}
        </div>
        {total > 0 && (
          <span className={`text-sm font-bold tabular-nums ${percent >= 100 ? "text-[var(--color-success-text)]" : "text-[var(--color-text-primary)]"}`}>
            {percent}%
          </span>
        )}
      </div>

      {total > 0 && <ProgressBar percent={percent} size="md" className="mb-4" />}

      {list.length > 0 ? (
        <ul className="space-y-2">
          {list.map((m) => {
            const imgs = milestoneImages(m);
            return (
              <li
                key={m.id}
                onClick={() => setOpenId(m.id)}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)]"
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(m); }}
                  disabled={!canComplete || togglingId === m.id}
                  aria-label={m.isDone ? "Mark not done" : "Mark done"}
                  title={canComplete ? (m.isDone ? "Mark not done" : "Mark done") : "Only staff can complete to-dos"}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    m.isDone
                      ? "border-[var(--color-success-text)] bg-[var(--color-success-text)] text-white"
                      : "border-[var(--color-border-hover)] text-transparent hover:border-[var(--color-success-text)]"
                  } ${canComplete ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>

                {imgs[0] && (
                  <span className="relative shrink-0">
                    <img src={getFileUrl(imgs[0])} alt="" className="h-10 w-10 rounded-lg border border-[var(--color-border)] object-cover" />
                    {imgs.length > 1 && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--color-panel-solid)] px-1 text-[9px] font-bold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                        {imgs.length}
                      </span>
                    )}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${m.isDone ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]"}`}>
                    {m.title}
                  </p>
                  {m.description && <p className="truncate text-xs text-[var(--color-text-muted)]">{m.description}</p>}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5" />
              </li>
            );
          })}
        </ul>
      ) : (
        !adding && <p className="text-xs text-[var(--color-text-muted)]">No to-dos yet. Break this task into smaller to-dos to track progress.</p>
      )}

      {adding ? (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="To-do title"
            maxLength={160}
            className="input-dark w-full px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); create(); } }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="input-dark w-full resize-y px-3 py-2 text-sm"
          />
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((f, i) => (
                <span key={i} className="relative h-14 w-14">
                  <img src={URL.createObjectURL(f)} alt="" className="h-14 w-14 rounded-lg border border-[var(--color-border)] object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-panel-solid)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-destructive-text)]"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages((prev) => [...prev, ...Array.from(e.target.files || [])])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)]"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Add images
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={resetForm} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
              <button
                type="button"
                onClick={create}
                disabled={!title.trim() || busy}
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to-do"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border-hover)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
        >
          <Plus className="h-3.5 w-3.5" /> Add to-do
        </button>
      )}

      {open && (
        <TodoDetailModal
          key={open.id}
          taskId={taskId}
          milestone={open}
          canComplete={canComplete}
          canEdit={isAdmin || open.createdById === currentUserId}
          onClose={() => setOpenId(null)}
          onToggle={() => toggle(open)}
          onDelete={() => remove(open)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ----------------------------- detail modal ------------------------------ */

function TodoDetailModal({
  taskId, milestone, canComplete, canEdit, onClose, onToggle, onDelete, onChanged,
}: {
  taskId: number;
  milestone: Milestone;
  canComplete: boolean;
  canEdit: boolean;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const imgs = milestoneImages(milestone);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      await API.post(`/tasks/${taskId}/milestones/${milestone.id}/images`, fd);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't add images");
    } finally {
      setUploading(false);
      if (addRef.current) addRef.current.value = "";
    }
  };

  const removeImage = async (url: string) => {
    try {
      await API.delete(`/tasks/${taskId}/milestones/${milestone.id}/images`, { data: { url } });
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't remove image");
    }
  };

  const created = new Date(milestone.createdAt);
  const createdLabel = isNaN(created.getTime())
    ? null
    : created.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <Modal isOpen onClose={onClose} maxWidth="xl" title={milestone.title}>
      <div className="space-y-5">
        {/* status + done toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              milestone.isDone
                ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-1 ring-inset ring-[var(--color-success-border)]"
                : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"
            }`}
          >
            {milestone.isDone ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Done</> : <>● To do</>}
          </span>
          {canComplete && (
            <button
              type="button"
              onClick={onToggle}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                milestone.isDone
                  ? "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                  : "bg-[var(--color-success-text)] text-white hover:brightness-110"
              }`}
            >
              {milestone.isDone ? "Mark as not done" : "✓ Mark as done"}
            </button>
          )}
        </div>

        {/* description */}
        {milestone.description ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">{milestone.description}</p>
          </div>
        ) : (
          <p className="text-sm italic text-[var(--color-text-muted)]">No description.</p>
        )}

        {/* images */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Images{imgs.length > 0 ? ` · ${imgs.length}` : ""}
            </p>
            {canEdit && (
              <>
                <input ref={addRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(Array.from(e.target.files || []))} />
                <button
                  type="button"
                  onClick={() => addRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Add"}
                </button>
              </>
            )}
          </div>
          {imgs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {imgs.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <img
                    src={getFileUrl(url)}
                    alt=""
                    loading="lazy"
                    onClick={() => setLightbox(url)}
                    className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-105"
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                      aria-label="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-[var(--color-destructive-text)] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => addRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border-hover)] text-[var(--color-text-muted)] transition hover:border-[var(--color-focus-ring)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-semibold">{uploading ? "Uploading…" : "Add image"}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => canEdit && addRef.current?.click()}
              disabled={!canEdit || uploading}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border-hover)] py-8 text-[var(--color-text-muted)] transition ${canEdit ? "hover:border-[var(--color-focus-ring)] hover:text-[var(--color-text-secondary)]" : "cursor-default"}`}
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm font-medium">{canEdit ? "Add images to this to-do" : "No images"}</span>
            </button>
          )}
        </div>

        {/* footer: meta + delete */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <span className="text-xs text-[var(--color-text-muted)]">{createdLabel ? `Created ${createdLabel}` : ""}</span>
          {canEdit && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-destructive-text)] transition hover:bg-[var(--color-destructive-bg)]"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 animate-fade-in" onClick={() => setLightbox(null)}>
          <img src={getFileUrl(lightbox)} alt="" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-elev-lg" onClick={(e) => e.stopPropagation()} />
          <button type="button" aria-label="Close image" onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white/80 transition hover:bg-black/60 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </Modal>
  );
}
