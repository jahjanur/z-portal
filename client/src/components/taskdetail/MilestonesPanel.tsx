import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus, Trash2, ImagePlus, Flag } from "lucide-react";
import API, { getFileUrl } from "../../api";
import ProgressBar from "../ui/ProgressBar";
import { type Milestone, milestoneProgress } from "../../utils/milestones";

interface Props {
  taskId: number;
  milestones?: Milestone[] | null;
  /** Admin or assigned worker — may tick milestones done. */
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
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle(""); setDescription(""); setImage(null); setAdding(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (image) fd.append("image", image);
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
          {total > 0 && (
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{done}/{total}</span>
          )}
        </div>
        {total > 0 && (
          <span className={`text-sm font-bold tabular-nums ${percent >= 100 ? "text-[var(--color-success-text)]" : "text-[var(--color-text-primary)]"}`}>
            {percent}%
          </span>
        )}
      </div>

      {total > 0 && <ProgressBar percent={percent} size="md" className="mb-4" />}

      {/* list */}
      {list.length > 0 ? (
        <ul className="space-y-2">
          {list.map((m) => {
            const canDelete = isAdmin || m.createdById === currentUserId;
            return (
              <li key={m.id} className="group flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  disabled={!canComplete || togglingId === m.id}
                  aria-label={m.isDone ? "Mark not done" : "Mark done"}
                  title={canComplete ? (m.isDone ? "Mark not done" : "Mark done") : "Only staff can complete to-dos"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    m.isDone
                      ? "border-[var(--color-success-text)] bg-[var(--color-success-text)] text-white"
                      : "border-[var(--color-border-hover)] text-transparent hover:border-[var(--color-success-text)]"
                  } ${canComplete ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>

                {m.imageUrl && (
                  <img
                    src={getFileUrl(m.imageUrl)}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-[var(--color-border)] object-cover"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${m.isDone ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]"}`}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-[var(--color-text-muted)]">{m.description}</p>
                  )}
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label="Delete to-do"
                    className="mt-0.5 shrink-0 text-[var(--color-text-muted)] opacity-0 transition hover:text-[var(--color-destructive-text)] focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        !adding && <p className="text-xs text-[var(--color-text-muted)]">No to-dos yet. Break this task into smaller to-dos to track progress.</p>
      )}

      {/* add */}
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
          <div className="flex items-center justify-between gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)]"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {image ? <span className="max-w-[120px] truncate">{image.name}</span> : "Add image"}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={resetForm} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                Cancel
              </button>
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
    </div>
  );
}
