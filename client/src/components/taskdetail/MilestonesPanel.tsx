import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Check, Plus, Trash2, ImagePlus, Flag, X, ChevronRight, ChevronLeft, Github, Rocket, Pencil, RotateCcw, Paperclip, FileText, MessageSquare } from "lucide-react";
import API, { getFileUrl } from "../../api";
import Modal from "../ui/Modal";
import ProgressBar from "../ui/ProgressBar";
import { useFileDrop } from "../../hooks/useFileDrop";
import { type Milestone, type LinkedComment, type Priority, milestoneProgress, milestoneImages, milestoneDocs, fileExt, priorityMeta, PRIORITIES } from "../../utils/milestones";

/** Colored pill selector for choosing a to-do priority. */
function PrioritySelect({ value, onChange, size = "sm" }: { value: Priority; onChange: (p: Priority) => void; size?: "sm" | "md" }) {
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRIORITIES.map((p) => {
        const meta = priorityMeta(p);
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset transition ${pad} ${
              active ? meta.pill : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${active ? meta.dot : "bg-[var(--color-text-muted)]"}`} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small colored priority badge shown on a to-do. */
function PriorityBadge({ priority, className = "" }: { priority?: string | null; className?: string }) {
  const meta = priorityMeta(priority);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${meta.badge} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

const fmtWhen = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/** Images plus common document types the pickers accept. */
const ATTACH_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.zip";

/** Short label for a stored document URL, e.g. "PDF" / "DOCX" / "FILE". */
function docLabel(url: string): string {
  const ext = fileExt(url);
  return ext ? ext.toUpperCase() : "FILE";
}

interface Props {
  taskId: number;
  milestones?: Milestone[] | null;
  /** Admin or assigned worker — may tick to-dos done. */
  canComplete: boolean;
  currentUserId: number;
  isAdmin: boolean;
  onChanged: () => void;
  /** When provided, clicking a to-do opens it via the parent (which renders one
   *  shared modal, so chat chips and the panel open the same dialog). */
  onOpenTodo?: (id: number) => void;
}

export default function MilestonesPanel({ taskId, milestones, canComplete, currentUserId, isAdmin, onChanged, onOpenTodo }: Props) {
  const list = milestones ?? [];
  const { total, done, percent } = milestoneProgress(list);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState<"all" | "todo" | "pushed" | "deployed">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const { dragging: createDragging, dropHandlers: createDrop } = useFileDrop((files) => setImages((prev) => [...prev, ...files]));

  const open = openId != null ? list.find((m) => m.id === openId) ?? null : null;

  // Stage buckets for the filter: "todo" = no stage yet, "pushed" = pushed to
  // GitHub but not deployed, "deployed" = deployed.
  const stageCounts = {
    all: list.length,
    todo: list.filter((m) => !m.pushedToGithub && !m.deployed).length,
    pushed: list.filter((m) => !!m.pushedToGithub && !m.deployed).length,
    deployed: list.filter((m) => !!m.deployed).length,
  };
  const filteredList = list.filter((m) => {
    switch (stageFilter) {
      case "todo": return !m.pushedToGithub && !m.deployed;
      case "pushed": return !!m.pushedToGithub && !m.deployed;
      case "deployed": return !!m.deployed;
      default: return true;
    }
  });
  const STAGE_FILTERS: { key: typeof stageFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "todo", label: "To do" },
    { key: "pushed", label: "Pushed" },
    { key: "deployed", label: "Deployed" },
  ];

  const resetForm = () => {
    setTitle(""); setDescription(""); setPriority("MEDIUM"); setImages([]); setAdding(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("priority", priority);
      images.forEach((f) => fd.append("images", f));
      // Content-Type:undefined lets the browser set multipart/form-data + boundary
      // (the API instance defaults to application/json, which breaks file uploads).
      await API.post(`/tasks/${taskId}/milestones`, fd, { headers: { "Content-Type": undefined } });
      resetForm();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't add to-do");
    } finally {
      setBusy(false);
    }
  };

  /** Toggle a stage (github → deployed). The server keeps them in order and
   *  marks the to-do done once both are set. */
  const setStage = async (m: Milestone, stage: "pushedToGithub" | "deployed", value: boolean) => {
    if (!canComplete) return;
    try {
      await API.patch(`/tasks/${taskId}/milestones/${m.id}`, { [stage]: value });
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't update stage");
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

      {list.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStageFilter(f.key)}
              aria-pressed={stageFilter === f.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition ${
                stageFilter === f.key
                  ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] ring-[var(--color-tab-active-border)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{stageCounts[f.key]}</span>
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        !adding && <p className="text-xs text-[var(--color-text-muted)]">No to-dos yet. Break this task into smaller to-dos to track progress.</p>
      ) : filteredList.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-muted)]">No to-dos in this filter.</p>
      ) : (
        <ul className="space-y-2">
          {filteredList.map((m) => {
            const imgs = milestoneImages(m);
            const docs = milestoneDocs(m);
            return (
              <li
                key={m.id}
                onClick={() => (onOpenTodo ? onOpenTodo(m.id) : setOpenId(m.id))}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)]"
              >
                <span
                  aria-label={m.isDone ? "Done" : "Not done"}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    m.isDone
                      ? "border-[var(--color-success-text)] bg-[var(--color-success-text)] text-white"
                      : "border-[var(--color-border-hover)] text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>

                {imgs[0] ? (
                  <span className="relative shrink-0">
                    <img src={getFileUrl(imgs[0])} alt="" className="h-10 w-10 rounded-lg border border-[var(--color-border)] object-cover" />
                    {imgs.length > 1 && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--color-panel-solid)] px-1 text-[9px] font-bold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                        {imgs.length}
                      </span>
                    )}
                  </span>
                ) : docs.length > 0 ? (
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                    <FileText className="h-5 w-5" />
                    {docs.length > 1 && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--color-panel-solid)] px-1 text-[9px] font-bold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                        {docs.length}
                      </span>
                    )}
                  </span>
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className={`truncate text-sm font-semibold ${m.isDone ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]"}`}>
                      {m.title}
                    </p>
                    {!m.isDone && <PriorityBadge priority={m.priority} className="shrink-0" />}
                  </div>
                  {m.description && <p className="truncate text-xs text-[var(--color-text-muted)]">{m.description}</p>}
                  <StageChips m={m} canComplete={canComplete} onToggle={setStage} className="mt-1.5" />
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5" />
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div
          {...createDrop}
          className={`mt-3 space-y-2 rounded-xl border bg-[var(--color-surface-1)] p-3 transition ${createDragging ? "border-[var(--color-focus-ring)] ring-2 ring-[var(--color-focus-ring)]/40" : "border-[var(--color-border)]"}`}
        >
          {createDragging && (
            <p className="rounded-lg border border-dashed border-[var(--color-focus-ring)] bg-[var(--color-focus-ring)]/5 py-2 text-center text-xs font-semibold text-[var(--color-text-secondary)]">Drop files to attach</p>
          )}
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Priority</span>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((f, i) => {
                const isImg = f.type.startsWith("image/");
                return (
                  <span key={i} className="relative">
                    {isImg ? (
                      <img src={URL.createObjectURL(f)} alt="" className="h-14 w-14 rounded-lg border border-[var(--color-border)] object-cover" />
                    ) : (
                      <span className="flex h-14 min-w-[3.5rem] max-w-[8rem] flex-col items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-[var(--color-text-secondary)]">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="w-full truncate text-center text-[10px] font-medium" title={f.name}>{f.name}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-panel-solid)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-destructive-text)]"
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <input ref={fileRef} type="file" accept={ATTACH_ACCEPT} multiple className="hidden" onChange={(e) => setImages((prev) => [...prev, ...Array.from(e.target.files || [])])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)]"
            >
              <Paperclip className="h-3.5 w-3.5" /> Add files
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

      {!onOpenTodo && open && (
        <TodoDetailModal
          key={open.id}
          taskId={taskId}
          milestone={open}
          canComplete={canComplete}
          canEdit={isAdmin || open.createdById === currentUserId}
          onClose={() => setOpenId(null)}
          onSetStage={(stage, value) => setStage(open, stage, value)}
          onDelete={() => remove(open)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ----------------------------- detail modal ------------------------------ */

export function TodoDetailModal({
  taskId, milestone, canComplete, canEdit, onClose, onSetStage, onDelete, onChanged, onJumpToComment,
}: {
  taskId: number;
  milestone: Milestone;
  canComplete: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSetStage: (stage: "pushedToGithub" | "deployed", value: boolean) => void;
  onDelete: () => void;
  onChanged: () => void;
  /** Jump to a linked chat message (closes the modal + scrolls the chat to it). */
  onJumpToComment?: (comment: LinkedComment) => void;
}) {
  const linkedMessages: LinkedComment[] = (milestone.commentLinks ?? [])
    .map((l) => l.comment)
    .filter(Boolean);
  const imgs = milestoneImages(milestone);
  const docs = milestoneDocs(milestone);
  // Lightbox tracks an index into imgs so you can page through with the arrows,
  // keyboard (←/→/Esc) or a swipe. null = closed.
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const touchX = useRef<number | null>(null);

  const closeLightbox = () => setLightboxIdx(null);
  const showPrev = () => setLightboxIdx((i) => (i === null ? i : (i - 1 + imgs.length) % imgs.length));
  const showNext = () => setLightboxIdx((i) => (i === null ? i : (i + 1) % imgs.length));

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, imgs.length]);

  // Inline edit of title/description
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDesc, setEditDesc] = useState(milestone.description ?? "");
  const [editPriority, setEditPriority] = useState<Priority>((milestone.priority ?? "MEDIUM").toUpperCase() as Priority);
  const [savingEdit, setSavingEdit] = useState(false);

  const saveEdit = async () => {
    if (!editTitle.trim()) { toast.error("Title can't be empty"); return; }
    setSavingEdit(true);
    try {
      await API.patch(`/tasks/${taskId}/milestones/${milestone.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        priority: editPriority,
      });
      setEditing(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  // Request changes on a stage (staff only) — rolls the stage back + notifies workers
  const [requesting, setRequesting] = useState(false);
  const [reqStage, setReqStage] = useState<"pushedToGithub" | "deployed">("pushedToGithub");
  const [reqComment, setReqComment] = useState("");
  const [sendingReq, setSendingReq] = useState(false);

  const submitRequest = async () => {
    setSendingReq(true);
    try {
      await API.post(`/tasks/${taskId}/milestones/${milestone.id}/request-changes`, {
        stage: reqStage,
        comment: reqComment.trim(),
      });
      const label = reqStage === "pushedToGithub" ? "GitHub" : "Deployed";
      toast.success(`Changes requested (${label}) — the team was notified`);
      setRequesting(false);
      setReqComment("");
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't request changes");
    } finally {
      setSendingReq(false);
    }
  };

  const addImages = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      await API.post(`/tasks/${taskId}/milestones/${milestone.id}/images`, fd, { headers: { "Content-Type": undefined } });
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't add images");
    } finally {
      setUploading(false);
      if (addRef.current) addRef.current.value = "";
    }
  };

  const { dragging: attachDragging, dropHandlers: attachDrop } = useFileDrop((files) => canEdit && addImages(files), { disabled: !canEdit });

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
        {/* status + stages (Pushed to GitHub → Deployed = done) */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                milestone.isDone
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-1 ring-inset ring-[var(--color-success-border)]"
                  : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"
              }`}
            >
              {milestone.isDone ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Done</> : <>● In progress</>}
            </span>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={milestone.priority} />
              <span className="text-xs text-[var(--color-text-muted)]">Deployed = done</span>
            </div>
          </div>
          <StageChipsModal milestone={milestone} canComplete={canComplete} onSetStage={onSetStage} />

          {/* Request changes (staff only): roll a stage back + notify the team */}
          {canComplete && (milestone.pushedToGithub || milestone.deployed) && (
            requesting ? (
              <div className="mt-3 space-y-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Request changes</p>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.filter((s) => !!milestone[s.key]).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReqStage(key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                        reqStage === key
                          ? "bg-[var(--color-focus-ring)]/15 text-[var(--color-text-primary)] ring-[var(--color-focus-ring)]"
                          : "bg-[var(--color-surface-1)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <Icon className="h-3 w-3" /> {label}
                    </button>
                  ))}
                </div>
                <textarea
                  autoFocus
                  value={reqComment}
                  onChange={(e) => setReqComment(e.target.value)}
                  placeholder="What needs fixing? (posted to the team chat)"
                  rows={3}
                  className="input-dark w-full resize-y px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => { setRequesting(false); setReqComment(""); }} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
                  <button
                    type="button"
                    onClick={submitRequest}
                    disabled={sendingReq}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-warning-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-warning-text)] ring-1 ring-inset ring-[var(--color-warning-border)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {sendingReq ? "Sending…" : "Send to team"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // default to the furthest-along completed stage
                  setReqStage(milestone.deployed ? "deployed" : "pushedToGithub");
                  setRequesting(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Request changes
              </button>
            )
          )}
        </div>

        {/* description (with inline edit) */}
        {canEdit && editing ? (
          <div className="space-y-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={160}
                className="input-dark w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="input-dark w-full resize-y px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Priority</label>
              <PrioritySelect value={editPriority} onChange={setEditPriority} size="md" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setEditing(false); setEditTitle(milestone.title); setEditDesc(milestone.description ?? ""); setEditPriority((milestone.priority ?? "MEDIUM").toUpperCase() as Priority); }} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit || !editTitle.trim()} className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Details</p>
              {canEdit && (
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
            {milestone.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">{milestone.description}</p>
            ) : (
              <p className="text-sm italic text-[var(--color-text-muted)]">No description.</p>
            )}
          </div>
        )}

        {/* attachments: images + documents (drag & drop enabled) */}
        <div {...attachDrop} className={`rounded-xl transition ${attachDragging ? "ring-2 ring-[var(--color-focus-ring)]/50" : ""}`}>
          {attachDragging && (
            <p className="mb-2.5 rounded-lg border border-dashed border-[var(--color-focus-ring)] bg-[var(--color-focus-ring)]/5 py-2 text-center text-xs font-semibold text-[var(--color-text-secondary)]">Drop images or documents to attach</p>
          )}
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Images{imgs.length > 0 ? ` · ${imgs.length}` : ""}
            </p>
            {canEdit && (
              <>
                <input ref={addRef} type="file" accept={ATTACH_ACCEPT} multiple className="hidden" onChange={(e) => addImages(Array.from(e.target.files || []))} />
                <button
                  type="button"
                  onClick={() => addRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Add files"}
                </button>
              </>
            )}
          </div>
          {imgs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {imgs.map((url, idx) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <img
                    src={getFileUrl(url)}
                    alt=""
                    loading="lazy"
                    onClick={() => setLightboxIdx(idx)}
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
          ) : docs.length === 0 ? (
            <button
              type="button"
              onClick={() => canEdit && addRef.current?.click()}
              disabled={!canEdit || uploading}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border-hover)] py-8 text-[var(--color-text-muted)] transition ${canEdit ? "hover:border-[var(--color-focus-ring)] hover:text-[var(--color-text-secondary)]" : "cursor-default"}`}
            >
              <Paperclip className="h-6 w-6" />
              <span className="text-sm font-medium">{canEdit ? "Add images or documents" : "No attachments"}</span>
            </button>
          ) : null}

          {/* documents */}
          {docs.length > 0 && (
            <div className="mt-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Documents · {docs.length}
              </p>
              <ul className="space-y-2">
                {docs.map((url) => (
                  <li key={url} className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <a
                      href={getFileUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:underline">{docLabel(url)} document</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Click to open · download</p>
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        aria-label="Remove document"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* linked chat messages — click to jump to the message in the conversation */}
        {onJumpToComment && linkedMessages.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              <MessageSquare className="h-3.5 w-3.5" /> Linked messages · {linkedMessages.length}
            </p>
            <ul className="space-y-2">
              {linkedMessages.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToComment(c)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 text-left transition hover:border-[var(--color-link)] hover:bg-[var(--color-surface-3)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-sm">
                      {c.user?.avatarEmoji || <MessageSquare className="h-4 w-4 text-[var(--color-text-muted)]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                          {c.user?.nickname || c.user?.name || "User"}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{fmtWhen(c.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--color-text-secondary)]">{c.content}</span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-link)]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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

      {/* Rendered in a portal on <body>: the Modal panel keeps a persistent
          `transform` (animate-scale-in uses fill-mode: both), which would make
          this fixed overlay resolve against the panel and get clipped by its
          overflow-hidden — cropping the image. */}
      {lightboxIdx !== null && imgs[lightboxIdx] && createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 animate-fade-in"
          onClick={closeLightbox}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) { dx > 0 ? showPrev() : showNext(); }
            touchX.current = null;
          }}
        >
          <img
            src={getFileUrl(imgs[lightboxIdx])}
            alt=""
            className="h-auto w-auto max-h-[92vh] max-w-[94vw] rounded-xl object-contain shadow-elev-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Prev / Next (only when there's more than one image) */}
          {imgs.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => { e.stopPropagation(); showPrev(); }}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/85 transition hover:bg-black/60 hover:text-white sm:left-5"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => { e.stopPropagation(); showNext(); }}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/85 transition hover:bg-black/60 hover:text-white sm:right-5"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/90 tabular-nums">
                {lightboxIdx + 1} / {imgs.length}
              </span>
            </>
          )}

          <div className="absolute right-4 top-4 flex items-center gap-2">
            {/* view the untouched file at its real resolution */}
            <a
              href={getFileUrl(imgs[lightboxIdx])}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-black/40 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-black/60 hover:text-white"
            >
              Open original
            </a>
            <button type="button" aria-label="Close image" onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="rounded-full bg-black/40 p-2 text-white/80 transition hover:bg-black/60 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </Modal>
  );
}

/* ----------------------------- stage chips ------------------------------- */

const STAGES = [
  { key: "pushedToGithub" as const, label: "Pushed", longLabel: "Pushed", Icon: Github },
  { key: "deployed" as const, label: "Deployed", longLabel: "Deployed", Icon: Rocket },
];

/** Compact stage chips for a to-do row (GitHub → Deployed). */
function StageChips({ m, canComplete, onToggle, className = "" }: {
  m: Milestone;
  canComplete: boolean;
  onToggle: (m: Milestone, stage: "pushedToGithub" | "deployed", value: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {STAGES.map(({ key, label, Icon }) => {
        const done = !!m[key];
        return (
          <button
            key={key}
            type="button"
            disabled={!canComplete}
            onClick={(e) => { e.stopPropagation(); onToggle(m, key, !done); }}
            aria-pressed={done}
            title={canComplete ? `Toggle ${label}` : label}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition ${
              done
                ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-[var(--color-success-border)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-[var(--color-border)]"
            } ${canComplete ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
          >
            {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Icon className="h-3 w-3" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Larger stage row for the detail modal. */
function StageChipsModal({ milestone, canComplete, onSetStage }: {
  milestone: Milestone;
  canComplete: boolean;
  onSetStage: (stage: "pushedToGithub" | "deployed", value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {STAGES.map(({ key, longLabel, Icon }, i) => {
        const done = !!milestone[key];
        return (
          <React.Fragment key={key}>
            <button
              type="button"
              disabled={!canComplete}
              onClick={() => onSetStage(key, !done)}
              aria-pressed={done}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 ring-inset transition ${
                done
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-[var(--color-success-border)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] ring-[var(--color-border)]"
              } ${canComplete ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
              {longLabel}
            </button>
            {i === 0 && <ChevronRight className="mx-auto hidden h-4 w-4 shrink-0 text-[var(--color-text-muted)] sm:block" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
