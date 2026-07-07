import React, { useMemo, useRef, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft, Paperclip, Send, Download, Maximize2, Check, RotateCcw,
  Image as ImageIcon, FileText, Palette, File as FileIcon, Calendar, RefreshCw, FolderKanban, ChevronDown, Trash2,
  Copy, CornerUpRight, Flag,
} from "lucide-react";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import WorkerMultiSelect from "../ui/WorkerMultiSelect";
import API, { getFileUrl } from "../../api";
import { ServiceTypePicker, ServiceFieldsForm } from "../admin/ServiceFields";
import type { ServiceType } from "../../utils/serviceTypes";
import AdminStatusControls from "./AdminStatusControls";
import WorkerStatusControls from "./WorkerStatusControls";
import ClientStatusView from "./ClientStatusView";
import MilestonesPanel, { TodoDetailModal } from "./MilestonesPanel";
import type { Milestone, LinkedComment } from "../../utils/milestones";
import SeoPanel from "./SeoPanel";

/* ------------------------------------------------------------------ helpers */
const roleTone = (role?: string): "info" | "neutral" | "success" =>
  role === "ADMIN" || role === "ERASPHERE" ? "info" : role === "WORKER" ? "neutral" : "success";

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

function avatarTint(role?: string): React.CSSProperties {
  if (role === "ADMIN" || role === "ERASPHERE")
    return { background: "var(--color-info-bg)", color: "var(--color-info-text)", borderColor: "var(--color-info-border)" };
  if (role === "WORKER")
    return { background: "var(--color-surface-3)", color: "var(--color-text-secondary)", borderColor: "var(--color-border)" };
  return { background: "var(--color-success-bg)", color: "var(--color-success-text)", borderColor: "var(--color-success-border)" };
}

function roleLabel(role?: string): string {
  if (role === "ERASPHERE") return "Admin";
  if (!role) return "User";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function isImageFile(file: any): boolean {
  return file?.fileType === "screenshot" || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file?.fileName || "");
}

function typeIcon(t: string) {
  if (t === "screenshot") return <ImageIcon className="h-4 w-4" />;
  if (t === "document") return <FileText className="h-4 w-4" />;
  if (t === "design") return <Palette className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

function statusDot(status: string): string {
  if (status === "COMPLETED") return "var(--color-success-text)";
  if (status === "IN_PROGRESS" || status === "PENDING_APPROVAL") return "var(--color-info-text)";
  return "var(--color-warning-text)";
}

/** Turn plain message text into React nodes, rendering URLs as Zulbera-tinted clickable links. */
const LINK_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
function linkify(text?: string): React.ReactNode {
  if (!text) return text ?? null;
  return text.split(LINK_RE).map((part, i) => {
    // split() with a capturing group puts the matched URLs at odd indexes
    if (i % 2 === 0) return part;
    // trailing punctuation usually isn't part of the URL — keep it as plain text
    const m = part.match(/^([\s\S]*?)([.,;:!?)\]]*)$/);
    const url = m ? m[1] : part;
    const trail = m ? m[2] : "";
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return (
      <React.Fragment key={i}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="break-words font-semibold text-[var(--color-link)] underline decoration-[var(--color-link)]/40 underline-offset-2 transition hover:text-[var(--color-link-hover)] hover:decoration-[var(--color-link-hover)]"
        >
          {url}
        </a>
        {trail}
      </React.Fragment>
    );
  });
}

const fmtTime = (d: string) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
function fmtDay(d: string): string {
  const date = new Date(d); const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return "Today";
  if (sameDay(date, yest)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/* ------------------------------------------------------------------ deliverable card */
/** Brand/asset image thumbnail: click to open the in-app viewer, hover for a download button. */
function AssetImage({ url, label, onView }: { url: string; label?: string; onView: () => void }) {
  return (
    <div className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <button type="button" onClick={onView} title={label || "View"} className="block h-full w-full">
        <img src={getFileUrl(url)} alt={label || ""} className="h-full w-full object-cover transition group-hover:scale-105" />
      </button>
      <a
        href={getFileUrl(url)}
        download={label || ""}
        onClick={(e) => e.stopPropagation()}
        title="Download"
        aria-label="Download"
        className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/75 group-hover:opacity-100"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function DeliverableCard({ file, p }: { file: any; p: any }) {
  const rs: string = file.reviewStatus;
  const isWorkerUpload = file.uploader?.role === "WORKER";
  const review = p.reviewState[file.id] ?? { pending: null, comment: "", saving: false };
  const canReview = p.currentUserRole === "ADMIN" && p.activeChannel === "worker" && isWorkerUpload && rs !== "APPROVED";
  const img = isImageFile(file);

  return (
    <div className="mt-2 max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <button
        type="button"
        onClick={() => p.openViewer(file)}
        className="group relative block h-44 w-full overflow-hidden"
        aria-label={`Open ${file.fileName}`}
      >
        {img ? (
          <img src={p.getFileUrl(file.fileUrl)} alt={file.caption || file.fileName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {typeIcon(file.fileType)}
            </span>
          </div>
        )}
        {/* review badge */}
        {isWorkerUpload && (
          <span className="absolute left-2.5 top-2.5">
            {rs === "PENDING" && <StatusBadge tone="warning">● Needs review</StatusBadge>}
            {rs === "APPROVED" && <StatusBadge status="APPROVED" />}
            {rs === "NEEDS_REVISION" && <StatusBadge tone="warning">Needs revision</StatusBadge>}
            {rs === "REJECTED" && <StatusBadge status="REJECTED" />}
          </span>
        )}
        <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
          {typeIcon(file.fileType)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{file.fileName}</p>
          <p className="truncate text-[11px] text-[var(--color-text-muted)] capitalize">
            {file.fileType}{file.section ? ` · ${file.section}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={() => p.openViewer(file)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">View</button>
          <a href={p.getFileUrl(file.fileUrl)} download={file.fileName} className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]" aria-label="Download"><Download className="h-3.5 w-3.5" /></a>
          {(p.isAdmin || file.uploadedBy === p.currentUserId) && (
            <button onClick={() => { if (window.confirm("Delete this file?")) p.deleteFile?.(file.id); }} className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-destructive-text)]" aria-label="Delete file"><Trash2 className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>

      {/* review comment shown to everyone */}
      {isWorkerUpload && file.reviewComment && rs !== "APPROVED" && (
        <p className="mx-3 mb-3 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs italic text-[var(--color-warning-text)]">
          “{file.reviewComment}”
        </p>
      )}

      {/* admin review actions */}
      {canReview && (
        <div className="border-t border-[var(--color-border)] p-3">
          {review.pending === "NEEDS_REVISION" ? (
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="What needs to change?"
                value={review.comment}
                onChange={(e) => p.setReviewState((prev: any) => ({ ...prev, [file.id]: { ...prev[file.id], comment: e.target.value } }))}
                className="w-full text-xs"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" disabled={review.saving || !review.comment.trim()} onClick={() => p.submitReview(file.id, "NEEDS_REVISION", review.comment)}>
                  {review.saving ? "Sending…" : "Request changes"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => p.setReviewState((prev: any) => ({ ...prev, [file.id]: { ...prev[file.id], pending: null } }))}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={review.saving} onClick={() => p.submitReview(file.id, "APPROVED")}
                className="!border-[var(--color-success-border)] !bg-[var(--color-success-bg)] !text-[var(--color-success-text)]">
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button variant="secondary" size="sm" disabled={review.saving}
                onClick={() => p.setReviewState((prev: any) => ({ ...prev, [file.id]: { ...prev[file.id], pending: "NEEDS_REVISION", comment: prev[file.id]?.comment ?? "", saving: false } }))}
                className="!border-[var(--color-warning-border)] !bg-[var(--color-warning-bg)] !text-[var(--color-warning-text)]">
                <RotateCcw className="h-3.5 w-3.5" /> Request changes
              </Button>
            </div>
          )}
        </div>
      )}

      {/* per-file replies */}
      {(file.comments?.length > 0 || true) && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          {file.comments?.map((fc: any) => (
            <div key={fc.id} id={`file-comment-${fc.id}`} className="mb-2 scroll-mt-20">
              <p className="text-[11px]"><span className="font-semibold text-[var(--color-text-primary)]">{fc.user?.name || "User"}</span> <span className="text-[var(--color-text-muted)]">· {fmtTime(fc.createdAt)}</span></p>
              <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{linkify(fc.content)}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Reply about this file…"
              value={p.fileComments[file.id] || ""}
              onChange={(e) => p.setFileComments({ ...p.fileComments, [file.id]: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") p.addFileComment(file.id); }}
              className="min-w-0 flex-1 !py-1.5 text-xs"
            />
            <Button variant="secondary" size="sm" disabled={p.addingFileComment[file.id] || !p.fileComments[file.id]?.trim()} onClick={() => p.addFileComment(file.id)}>
              {p.addingFileComment[file.id] ? "…" : "Reply"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ main */
/** Brand & assets panel — collapsible; lives in the task sidebar. Hidden from clients.
 *  Admins can edit the project's brand/metadata inline (no need to open Manage Projects). */
function BrandAssets({ task, p }: { task: any; p: any }) {
  const [editing, setEditing] = useState(false);
  const [draftMeta, setDraftMeta] = useState<Record<string, unknown>>({});
  const [draftSvc, setDraftSvc] = useState<ServiceType>("OTHER");
  const [saving, setSaving] = useState(false);

  if (p.currentUserRole === "CLIENT") return null;
  const c: any = task.client || {};
  const meta: any = task.project?.metadata || {};
  const projectId: number | undefined = task.project?.id;
  const canEdit = p.currentUserRole === "ADMIN" && !!projectId;
  const hexFrom = (s?: string) => (s ? s.match(/#[0-9a-fA-F]{6}/g) || [] : []);
  // Note: client.colorHex is excluded — it auto-defaults to #5B4FFF and is just
  // noise. Show the real palette: the client's brandPattern + the project colors.
  const colors = Array.from(
    new Set<string>([
      ...hexFrom(c.brandPattern),
      ...((Array.isArray(meta.brandColors) ? meta.brandColors : []) as string[]),
    ])
  );
  const assets = (Array.isArray(meta.assets) ? meta.assets : []).filter((a: any) => a?.url);
  const brief = String(meta.brief || meta.notes || "").trim();
  const hasLogo = !!c.logo;
  const isEmpty = !hasLogo && colors.length === 0 && assets.length === 0 && !brief && !c.shortInfo;
  if (isEmpty && !canEdit) return null;
  const isImg = (a: any) => a.fileType === "image" || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a.url || "");
  const openImg = (url: string) =>
    p.openViewer({
      id: -Math.abs([...url].reduce((acc: number, ch: string) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)) || -1,
      fileName: url.split("?")[0].split("/").pop() || "image",
      fileUrl: url,
      fileType: "image",
      uploadedAt: new Date().toISOString(),
    });

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraftMeta(meta);
    setDraftSvc(((task.project?.serviceType as ServiceType) || "OTHER"));
    setEditing(true);
  };
  const save = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await API.patch(`/projects/${projectId}`, { serviceType: draftSvc, metadata: draftMeta });
      toast.success("Brand assets updated");
      setEditing(false);
      p.onRefresh?.();
    } catch {
      toast.error("Couldn't save brand assets");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="card-panel overflow-hidden" open={editing ? true : undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <Palette className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-sm font-bold text-[var(--color-text-primary)]">Brand &amp; assets</span>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="ml-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
            Edit
          </button>
        )}
        <ChevronDown className={`h-4 w-4 text-[var(--color-text-muted)] ${canEdit && !editing ? "" : "ml-auto"}`} />
      </summary>
      <div className="space-y-4 border-t border-[var(--color-border)] p-4">
        {editing && (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Project type</p>
              <ServiceTypePicker value={draftSvc} onChange={(t) => setDraftSvc(t)} />
            </div>
            <ServiceFieldsForm serviceType={draftSvc} metadata={draftMeta} onChange={setDraftMeta} />
            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-[var(--color-nav-active-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-nav-active-text)] disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}
        {!editing && isEmpty && (
          <p className="text-xs text-[var(--color-text-muted)]">No brand assets yet. Click <span className="font-semibold">Edit</span> to add colors, files and a brief.</p>
        )}
        {!editing && (
          <>
        {hasLogo && (
          <div className="flex items-center gap-3">
            <AssetImage url={c.logo} label="logo" onView={() => openImg(c.logo)} />
            <span className="text-xs text-[var(--color-text-muted)]">Client logo</span>
          </div>
        )}
        {colors.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Brand colors</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((col, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] py-1 pl-1 pr-2">
                  <span className="h-5 w-5 rounded-md border border-[var(--color-border)]" style={{ background: col }} />
                  <span className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">{col}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {assets.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Assets &amp; references</p>
            <div className="flex flex-wrap gap-2">
              {assets.map((a: any, i: number) =>
                isImg(a) ? (
                  <AssetImage key={i} url={a.url} label={a.label} onView={() => openImg(a.url)} />
                ) : (
                  <a key={i} href={getFileUrl(a.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                    {a.label?.trim() || a.url}
                  </a>
                )
              )}
            </div>
          </div>
        )}
        {(brief || c.shortInfo) && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Brief</p>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{brief || c.shortInfo}</p>
          </div>
        )}
          </>
        )}
      </div>
    </details>
  );
}

/** Sibling tasks in the same project — vertical list for the sidebar. */
function SiblingTasks({ task, p }: { task: any; p: any }) {
  if (!p.project || (p.siblingTasks?.length ?? 0) <= 1) return null;
  return (
    <div className="card-panel p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        {p.siblingTasks.length} tasks in {p.project.name}
      </p>
      <div className="flex flex-col gap-2">
        {p.siblingTasks.map((t: any) => {
          const active = t.id === task.id;
          return (
            <button
              key={t.id}
              onClick={() => p.navigate(`/tasks/${t.id}`)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? "border-[var(--card-hover-border)] bg-[var(--color-surface-3)] text-[var(--color-text-primary)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusDot(t.status) }} />
              <span className="truncate">{t.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Task header card — title, status, primary action, and meta. Lives in the left column. */
function TaskHeaderCard({ task, p, hideTitle }: { task: any; p: any; hideTitle?: boolean }) {
  return (
    <div className="card-panel p-4 sm:p-5">
      {!hideTitle && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[1.5rem]">{task.title}</h1>
            {task.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{task.description}</p>}
          </div>
          <StatusBadge status={task.status} className="shrink-0" />
        </div>
      )}

      {/* primary status actions */}
      <div className={hideTitle ? "" : "mt-4"}>
        {p.currentUserRole === "ADMIN" && <AdminStatusControls currentStatus={task.status} onStatusChange={p.updateStatus} onApproveCompletion={p.approveCompletion} />}
        {p.currentUserRole === "WORKER" && <WorkerStatusControls currentStatus={task.status} onRequestCompletion={p.requestCompletion} />}
        {p.currentUserRole === "CLIENT" && <ClientStatusView currentStatus={task.status} />}
      </div>

      {/* meta: client + due + worker assignment */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold" style={avatarTint("CLIENT")}>{initials(task.client?.name)}</span>
          {task.client?.name ?? "Client removed"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
          <Calendar className="h-3.5 w-3.5" /> {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No deadline"}
        </span>
        {p.currentUserRole === "ADMIN" ? (
          <div className="w-full">
            <WorkerMultiSelect workers={p.workers} value={task.workers?.map((tw: any) => tw.user.id) ?? []} onChange={(ids: number[]) => p.updateWorkers(ids)} placeholder="Assign workers…" autoApply={false} usePortal />
          </div>
        ) : task.workers?.length ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {task.workers.map((tw: any) => (
              <span key={tw.user.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                {tw.user.avatarEmoji && <span className="text-sm leading-none">{tw.user.avatarEmoji}</span>}
                {tw.user.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            Unassigned
          </span>
        )}
      </div>
    </div>
  );
}

export default function TaskConversation(p: any) {
  const { task } = p;
  const feedRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // Mobile keyboard: the chat shell is position:fixed bottom-0. When the on-screen
  // keyboard opens, iOS/Android keep fixed-bottom elements *behind* the keyboard,
  // so we lift the shell by the keyboard's overlap using the visualViewport API.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const el = shellRef.current;
      if (!el) return;
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.bottom = overlap > 0 ? `${overlap}px` : "";
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const items = useMemo(() => {
    const comments = (task.comments || []).filter((c: any) =>
      p.isAdmin ? (p.activeChannel === "worker" ? !c.visibleToClient : !!c.visibleToClient) : true
    );
    const merged = [
      ...comments.map((c: any) => ({ kind: "msg" as const, at: c.createdAt, data: c })),
      ...p.visibleFiles.map((f: any) => ({ kind: "file" as const, at: f.uploadedAt, data: f })),
    ];
    return merged.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [task.comments, p.visibleFiles, p.isAdmin, p.activeChannel]);

  // auto-scroll to newest
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, p.activeChannel]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    p.setSelectedFiles((prev: File[]) => [...(prev || []), ...files]);
  };
  const removeFile = (idx: number) =>
    p.setSelectedFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== idx));

  const send = () => {
    if (p.selectedFiles?.length) {
      p.uploadFiles({ caption: p.newComment.trim() });
      p.setNewComment("");
    } else if (p.newComment.trim()) {
      p.addComment();
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId((k) => (k === key ? null : k)), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  // which message's "forward to…" picker is open (key = `${kind}-${id}`)
  const [forwardFor, setForwardFor] = useState<string | null>(null);

  /* ---- to-do (milestone) linking --------------------------------------- */
  const milestones: Milestone[] = task.milestones || [];
  // one shared to-do modal, opened either from the sidebar panel or a chat chip
  const [openMilestoneId, setOpenMilestoneId] = useState<number | null>(null);
  const openMilestone = openMilestoneId != null ? milestones.find((m) => m.id === openMilestoneId) ?? null : null;
  // which message's "link to to-do" picker is open (key = comment id)
  const [linkFor, setLinkFor] = useState<number | null>(null);

  const canCompleteTodos =
    p.currentUserRole === "ADMIN" ||
    (p.currentUserRole === "WORKER" && task.workers?.some((tw: any) => tw.user.id === p.currentUserId));

  /** Replace the full set of to-dos a message is linked to. */
  const saveLinks = async (commentId: number, milestoneIds: number[]) => {
    try {
      await API.put(`/tasks/${task.id}/comments/${commentId}/milestones`, { milestoneIds });
      p.onRefresh?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't update to-do links");
    }
  };
  const toggleLink = (comment: any, milestoneId: number) => {
    const current: number[] = (comment.milestoneLinks || []).map((l: any) => l.milestoneId);
    const next = current.includes(milestoneId) ? current.filter((x) => x !== milestoneId) : [...current, milestoneId];
    saveLinks(comment.id, next);
  };

  const setMilestoneStage = async (m: Milestone, stage: "pushedToGithub" | "deployed", value: boolean) => {
    try {
      await API.patch(`/tasks/${task.id}/milestones/${m.id}`, { [stage]: value });
      p.onRefresh?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't update stage");
    }
  };
  const removeMilestone = async (m: Milestone) => {
    if (!window.confirm("Delete this to-do?")) return;
    try {
      await API.delete(`/tasks/${task.id}/milestones/${m.id}`);
      setOpenMilestoneId(null);
      p.onRefresh?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't delete to-do");
    }
  };

  /** From a to-do's linked message → close the modal and scroll the chat to it. */
  const jumpToComment = (comment: LinkedComment) => {
    setOpenMilestoneId(null);
    // admins have two channels — switch to the one the message lives on
    if (p.isAdmin) {
      const ch = comment.visibleToClient ? "client" : "worker";
      if (p.activeChannel !== ch) p.setActiveChannel(ch);
    }
    setTimeout(() => {
      const el = document.getElementById(`task-comment-${comment.id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("comment-highlight-glow");
      setTimeout(() => el.classList.remove("comment-highlight-glow"), 3000);
    }, 90);
  };
  /** Forward a text message (quoted) or a file deliverable to a target channel. */
  const doForward = (item: any, fromName: string, toClient: boolean) => {
    if (item.kind === "msg") {
      const quoted = item.data.content.split("\n").map((l: string) => `> ${l}`).join("\n");
      p.forwardComment?.(`↪ Forwarded from ${fromName}:\n${quoted}`, toClient);
    } else {
      p.forwardFile?.(item.data.id, toClient);
    }
    setForwardFor(null);
  };

  const channels = [
    { key: "worker", label: "Worker channel", unseen: p.hasUnseen?.worker, count: p.unreadByTaskThread?.internal },
    { key: "client", label: "Client channel", unseen: p.hasUnseen?.client, count: p.unreadByTaskThread?.client },
  ] as const;

  let lastDay = "";

  return (
    <div className="lg:pt-16">
      {/* Mobile: pin the whole chat to the real viewport with position:fixed (top-16 → bottom-0)
          so the composer is ALWAYS visible and never falls off-screen behind the browser
          toolbar — vh/dvh units are unreliable on mobile. Desktop keeps the centered layout. */}
      <div ref={shellRef} className="fixed inset-x-0 bottom-0 top-header z-20 flex flex-col px-3 lg:static lg:z-auto lg:mx-auto lg:h-[calc(100dvh-4rem)] lg:w-full lg:max-w-[1400px] lg:flex-row lg:gap-6 lg:px-4">
        {/* LEFT — task header + brand & assets + sibling tasks (desktop sidebar) */}
        <aside className="hidden shrink-0 flex-col gap-3 overflow-y-auto py-4 lg:flex lg:w-[380px]">
          <TaskHeaderCard task={task} p={p} />
          {task.seoOrder ? (
            <SeoPanel
              order={task.seoOrder}
              isAdmin={p.isAdmin}
              canEdit={p.isAdmin || p.currentUserRole === "CLIENT"}
              onChanged={() => p.onRefresh?.()}
            />
          ) : (
            <MilestonesPanel
              taskId={task.id}
              milestones={task.milestones}
              canComplete={p.currentUserRole === "ADMIN" || (p.currentUserRole === "WORKER" && task.workers?.some((tw: any) => tw.user.id === p.currentUserId))}
              currentUserId={p.currentUserId}
              isAdmin={p.isAdmin}
              onChanged={() => p.onRefresh?.()}
              onOpenTodo={setOpenMilestoneId}
            />
          )}
          <BrandAssets task={task} p={p} />
          <SiblingTasks task={task} p={p} />
        </aside>

        {/* RIGHT — conversation (drag a file/image anywhere here to attach it) */}
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col"
          onDragOver={(e) => { if (e.dataTransfer.types?.includes("Files")) { e.preventDefault(); if (!dragging) setDragging(true); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={(e) => {
            if (!e.dataTransfer.files?.length) return;
            e.preventDefault();
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--card-hover-border)] bg-[var(--color-overlay)] backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-[var(--color-text-primary)]">
                <Paperclip className="h-7 w-7" />
                <p className="text-sm font-semibold">Drop to attach to the chat</p>
              </div>
            </div>
          )}
        {/* top: breadcrumb */}
        <div className="shrink-0 pt-3">
          <div className="mb-3 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <button onClick={() => p.navigate("/dashboard")} className="inline-flex items-center gap-1.5 transition hover:text-[var(--color-text-primary)]">
              <ArrowLeft className="h-4 w-4" /> Tasks
            </button>
            {p.project && (
              <>
                <span className="opacity-40">/</span>
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <FolderKanban className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.project.name}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mobile task details — desktop shows these in the left sidebar. Collapsed by
            default so the chat fills the screen; tap to reveal actions/brand. */}
        <details className="mb-2 shrink-0 lg:hidden">
          <summary className="card-panel flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--color-text-primary)]">{task.title}</span>
            <StatusBadge status={task.status} className="shrink-0" />
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          </summary>
          <div className="mt-2 max-h-[65vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
            <TaskHeaderCard task={task} p={p} hideTitle />
            {task.seoOrder ? (
              <SeoPanel
                order={task.seoOrder}
                isAdmin={p.isAdmin}
                canEdit={p.isAdmin || p.currentUserRole === "CLIENT"}
                onChanged={() => p.onRefresh?.()}
              />
            ) : (
              <MilestonesPanel
                taskId={task.id}
                milestones={task.milestones}
                canComplete={p.currentUserRole === "ADMIN" || (p.currentUserRole === "WORKER" && task.workers?.some((tw: any) => tw.user.id === p.currentUserId))}
                currentUserId={p.currentUserId}
                isAdmin={p.isAdmin}
                onChanged={() => p.onRefresh?.()}
                onOpenTodo={setOpenMilestoneId}
              />
            )}
            <BrandAssets task={task} p={p} />
            <SiblingTasks task={task} p={p} />
          </div>
        </details>

        {/* Scrollable conversation — header/brand/switchers scroll away so the chat gets the room */}
        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto pb-4 pt-1">
          {/* channel toggle */}
          {p.isAdmin && (
            <div className="mt-3 flex justify-center">
              <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                {channels.map((c) => (
                  <button key={c.key} type="button" onClick={() => { p.setActiveChannel(c.key); p.touchSeen(c.key); }}
                    className={`relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${p.activeChannel === c.key ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>
                    {c.unseen && p.activeChannel !== c.key && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-destructive-text)]" />}
                    {c.label}
                    {c.count ? <span className="ml-1.5 rounded-full bg-[var(--color-destructive-bg)] px-1.5 text-[11px] text-[var(--color-destructive-text)]">{c.count}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* conversation */}
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"><ImageIcon className="h-6 w-6" /></span>
              <p className="font-semibold text-[var(--color-text-primary)]">Nothing here yet</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--color-text-muted)]">Share the first deliverable or leave a note using the box below.</p>
            </div>
          ) : (
            items.map((it, i) => {
              const day = fmtDay(it.at);
              const showDay = day !== lastDay; lastDay = day;
              const d = it.data;
              const role = it.kind === "msg" ? d.user?.role : d.uploader?.role;
              const name = it.kind === "msg" ? (d.user?.name || `User #${d.userId}`) : (d.uploader?.name || "Worker");
              const emoji = it.kind === "msg" ? d.user?.avatarEmoji : d.uploader?.avatarEmoji;
              return (
                <React.Fragment key={`${it.kind}-${d.id}`}>
                  {showDay && (
                    <div className="my-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <span className="h-px flex-1 bg-[var(--color-border)]" />{day}<span className="h-px flex-1 bg-[var(--color-border)]" />
                    </div>
                  )}
                  <div id={it.kind === "msg" ? `task-comment-${d.id}` : undefined} className="group flex gap-3 py-2 scroll-mt-20" style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold" style={avatarTint(role)}>{emoji ? <span className="text-base leading-none">{emoji}</span> : initials(name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{name}</span>
                        <StatusBadge dot={false} tone={roleTone(role)} className="!px-1.5 !py-0 text-[9px] uppercase tracking-wide">{roleLabel(role)}</StatusBadge>
                        <span className="ml-auto text-[11px] text-[var(--color-text-muted)]">{fmtTime(it.at)}</span>
                        {/* per-message actions: copy (everyone) + forward picker (admin) */}
                        {(() => {
                          const text = it.kind === "msg" ? d.content : (d.caption || "");
                          const copyKey = `${it.kind}-${d.id}`;
                          const isCopied = copiedId === copyKey;
                          // text messages need content; files are always forwardable (the file itself)
                          const canForward = p.isAdmin && (p.forwardComment || p.forwardFile) && (it.kind === "file" || !!d.content);
                          const fwdOpen = forwardFor === copyKey;
                          return (
                            <>
                              {text && (
                                <button
                                  type="button"
                                  onClick={() => copyText(copyKey, text)}
                                  title={isCopied ? "Copied!" : "Copy text"}
                                  aria-label="Copy message text"
                                  className="text-[var(--color-text-muted)] opacity-0 transition hover:text-[var(--color-text-primary)] focus:opacity-100 group-hover:opacity-100"
                                >
                                  {isCopied ? <Check className="h-3.5 w-3.5 text-[var(--color-success-text)]" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              )}
                              {canForward && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setForwardFor(fwdOpen ? null : copyKey)}
                                    title="Forward to another channel"
                                    aria-label="Forward to another channel"
                                    aria-expanded={fwdOpen}
                                    className={`transition focus:opacity-100 group-hover:opacity-100 ${fwdOpen ? "text-[var(--color-info-text)] opacity-100" : "text-[var(--color-text-muted)] opacity-0 hover:text-[var(--color-info-text)]"}`}
                                  >
                                    <CornerUpRight className="h-3.5 w-3.5" />
                                  </button>
                                  {fwdOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setForwardFor(null)} aria-hidden />
                                      <div className="absolute right-0 top-6 z-50 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-solid)] p-1 shadow-elev-lg animate-scale-in">
                                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Forward to</p>
                                        {[
                                          { toClient: false, label: "Worker channel" },
                                          { toClient: true, label: "Client channel" },
                                        ].map((opt) => {
                                          const here = !!d.visibleToClient === opt.toClient;
                                          return (
                                            <button
                                              key={opt.label}
                                              type="button"
                                              onClick={() => doForward(it, name, opt.toClient)}
                                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                                            >
                                              <CornerUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                                              <span className="flex-1 truncate">{opt.label}</span>
                                              {here && <span className="text-[10px] text-[var(--color-text-muted)]">here</span>}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                              {it.kind === "msg" && milestones.length > 0 && (() => {
                                const linkOpen = linkFor === d.id;
                                const linkedIds: number[] = (d.milestoneLinks || []).map((l: any) => l.milestoneId);
                                return (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setLinkFor(linkOpen ? null : d.id)}
                                      title="Link to a to-do"
                                      aria-label="Link this message to a to-do"
                                      aria-expanded={linkOpen}
                                      className={`transition focus:opacity-100 group-hover:opacity-100 ${linkOpen || linkedIds.length ? "text-[var(--color-link)] opacity-100" : "text-[var(--color-text-muted)] opacity-0 hover:text-[var(--color-link)]"}`}
                                    >
                                      <Flag className="h-3.5 w-3.5" />
                                    </button>
                                    {linkOpen && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setLinkFor(null)} aria-hidden />
                                        <div className="absolute right-0 top-6 z-50 max-h-72 w-56 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-solid)] p-1 shadow-elev-lg animate-scale-in">
                                          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Link to to-do</p>
                                          {milestones.map((m) => {
                                            const on = linkedIds.includes(m.id);
                                            return (
                                              <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => toggleLink(d, m.id)}
                                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                                              >
                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-[var(--color-link)] bg-[var(--color-link)] text-white" : "border-[var(--color-border-hover)] text-transparent"}`}>
                                                  <Check className="h-3 w-3" strokeWidth={3} />
                                                </span>
                                                <span className="flex-1 truncate">{m.title}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                        {it.kind === "msg" && (p.isAdmin || d.userId === p.currentUserId) && (
                          <button
                            type="button"
                            onClick={() => { if (window.confirm("Delete this message?")) p.deleteComment?.(d.id); }}
                            title="Delete message"
                            aria-label="Delete message"
                            className="text-[var(--color-text-muted)] opacity-0 transition hover:text-[var(--color-destructive-text)] focus:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {it.kind === "msg" ? (
                        <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{linkify(d.content)}</p>
                      ) : (
                        <>
                          {d.caption && <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{linkify(d.caption)}</p>}
                          <DeliverableCard file={d} p={p} />
                        </>
                      )}
                      {/* to-dos this message is linked to — click a chip to open the to-do */}
                      {it.kind === "msg" && (d.milestoneLinks?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {(d.milestoneLinks as any[])
                            .map((l) => milestones.find((m) => m.id === l.milestoneId))
                            .filter((m): m is Milestone => !!m)
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setOpenMilestoneId(m.id)}
                                title={`Open to-do: ${m.title}`}
                                className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-[var(--color-link)]/40 bg-[var(--color-link)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-link)] transition hover:bg-[var(--color-link)]/20"
                              >
                                <Flag className="h-3 w-3 shrink-0" />
                                <span className="truncate">{m.title}</span>
                                {m.isDone && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          </div>
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-[var(--color-border)] py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 0.75rem)" }}>
          <input
            ref={p.fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              if (p.fileInputRef.current) p.fileInputRef.current.value = "";
            }}
          />
          {p.selectedFiles?.length > 0 && (
            <div className="mb-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
              {p.selectedFiles.map((f: File, i: number) => (
                <span key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-1.5 text-xs">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`} className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
                </span>
              ))}
              {p.selectedFiles.length > 1 && (
                <button type="button" onClick={() => p.setSelectedFiles([])} className="inline-flex items-center rounded-xl px-2 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]">
                  Clear all
                </button>
              )}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-border-hover)] bg-[var(--color-surface-2)] py-1.5 pl-3 pr-1.5">
            <textarea
              rows={1}
              value={p.newComment}
              onChange={(e) => {
                p.setNewComment(e.target.value);
                // auto-grow so longer messages stay visible (capped at max-h)
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={p.selectedFiles?.length ? "Add a note…" : "Write a message…"}
              // explicit colour + WebkitTextFillColor fixes iOS hiding the text inside
              // the position:fixed composer; px-0 + !py-2 replaces the !p-0/py-1.5 clash.
              style={{ color: "var(--color-text-primary)", WebkitTextFillColor: "var(--color-text-primary)" }}
              className="max-h-32 min-h-[2.25rem] flex-1 resize-none self-center !border-0 !bg-transparent px-0 !py-2 text-base leading-snug !shadow-none !ring-0 placeholder:text-[var(--color-placeholder)] focus:!ring-0 sm:text-sm"
            />
            <button type="button" onClick={() => p.fileInputRef.current?.click()} aria-label="Attach file" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]">
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={send} disabled={p.uploadingFile || p.addingComment || (!p.newComment.trim() && !p.selectedFiles?.length)} aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] transition disabled:opacity-40">
              {p.uploadingFile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-[17px] w-[17px]" />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3 px-1 text-[11px] text-[var(--color-text-muted)]">
            <button onClick={p.onRefresh} className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]"><RefreshCw className={`h-3 w-3 ${p.refreshing ? "animate-spin" : ""}`} /> Refresh</button>
          </div>
        </div>
        </div>
      </div>

      {/* One shared to-do modal — opened from the sidebar panel or a chat chip.
          Its "Linked messages" section jumps back to the exact message in chat. */}
      {openMilestone && (
        <TodoDetailModal
          key={openMilestone.id}
          taskId={task.id}
          milestone={openMilestone}
          canComplete={canCompleteTodos}
          canEdit={p.isAdmin || openMilestone.createdById === p.currentUserId}
          onClose={() => setOpenMilestoneId(null)}
          onSetStage={(stage, value) => setMilestoneStage(openMilestone, stage, value)}
          onDelete={() => removeMilestone(openMilestone)}
          onChanged={() => p.onRefresh?.()}
          onJumpToComment={jumpToComment}
        />
      )}
    </div>
  );
}
