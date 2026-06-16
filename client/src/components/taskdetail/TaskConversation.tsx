import React, { useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft, Paperclip, Send, Download, Maximize2, Check, RotateCcw,
  Image as ImageIcon, FileText, Palette, File as FileIcon, Calendar, RefreshCw, FolderKanban, ChevronDown,
} from "lucide-react";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import WorkerMultiSelect from "../ui/WorkerMultiSelect";
import { getFileUrl } from "../../api";
import AdminStatusControls from "./AdminStatusControls";
import WorkerStatusControls from "./WorkerStatusControls";
import ClientStatusView from "./ClientStatusView";

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

function guessType(name: string): string {
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return "screenshot";
  if (/\.(pdf|docx?|txt|md|csv|xlsx?)$/i.test(name)) return "document";
  if (/\.(fig|sketch|psd|ai|xd)$/i.test(name)) return "design";
  return "other";
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
              <p className="text-xs text-[var(--color-text-secondary)]">{fc.content}</p>
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
export default function TaskConversation(p: any) {
  const { task } = p;
  const feedRef = useRef<HTMLDivElement | null>(null);

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

  const send = () => {
    if (p.selectedFile) {
      p.uploadFile({ caption: p.newComment.trim(), fileType: guessType(p.selectedFile.name) });
      p.setNewComment("");
    } else if (p.newComment.trim()) {
      p.addComment();
    }
  };

  const channels = [
    { key: "worker", label: "Worker channel", unseen: p.hasUnseen?.worker, count: p.unreadByTaskThread?.internal },
    { key: "client", label: "Client channel", unseen: p.hasUnseen?.client, count: p.unreadByTaskThread?.client },
  ] as const;

  let lastDay = "";

  return (
    <div className="pt-16">
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-3 sm:px-4">
        {/* top: breadcrumb + header */}
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

        {/* Scrollable conversation — header/brand/switchers scroll away so the chat gets the room */}
        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto pb-4 pt-1">
          <div className="card-panel p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[1.7rem]">{task.title}</h1>
                {task.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{task.description}</p>}
              </div>
              <StatusBadge status={task.status} className="shrink-0" />
            </div>

            {/* primary status actions */}
            <div className="mt-4">
              {p.currentUserRole === "ADMIN" && <AdminStatusControls currentStatus={task.status} onStatusChange={p.updateStatus} onApproveCompletion={p.approveCompletion} />}
              {p.currentUserRole === "WORKER" && <WorkerStatusControls currentStatus={task.status} onRequestCompletion={p.requestCompletion} />}
              {p.currentUserRole === "CLIENT" && <ClientStatusView currentStatus={task.status} />}
            </div>

            {/* meta: client + due (display), worker assignment last so its menu opens into open space */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold" style={avatarTint("CLIENT")}>{initials(task.client?.name)}</span>
                {task.client?.name ?? "Client removed"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                <Calendar className="h-3.5 w-3.5" /> {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No deadline"}
              </span>
              {p.currentUserRole === "ADMIN" ? (
                <div className="w-full sm:ml-auto sm:w-60">
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

          {/* Brand & assets — a work tool for the team (admin/worker/partner) so they
              can do the work. Hidden from clients (they provided it and can't access
              the internal project files anyway). */}
          {p.currentUserRole !== "CLIENT" && (() => {
            const c: any = task.client || {};
            const meta: any = task.project?.metadata || {};
            const hexFrom = (s?: string) => (s ? s.match(/#[0-9a-fA-F]{6}/g) || [] : []);
            const colors = Array.from(
              new Set<string>([
                ...hexFrom(c.colorHex),
                ...hexFrom(c.brandPattern),
                ...((Array.isArray(meta.brandColors) ? meta.brandColors : []) as string[]),
              ])
            );
            const assets = (Array.isArray(meta.assets) ? meta.assets : []).filter((a: any) => a?.url);
            const brief = String(meta.brief || meta.notes || "").trim();
            const hasLogo = !!c.logo;
            if (!hasLogo && colors.length === 0 && assets.length === 0 && !brief && !c.shortInfo) return null;
            const isImg = (a: any) => a.fileType === "image" || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a.url || "");
            const openImg = (url: string) =>
              p.openViewer({
                id: -Math.abs([...url].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)) || -1,
                fileName: url.split("?")[0].split("/").pop() || "image",
                fileUrl: url,
                fileType: "image",
                uploadedAt: new Date().toISOString(),
              });
            return (
              <details className="mt-3 card-panel overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <Palette className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">Brand &amp; assets</span>
                  <span className="ml-auto text-[11px] font-normal text-[var(--color-text-muted)]">view</span>
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                </summary>
                <div className="space-y-4 border-t border-[var(--color-border)] p-4 sm:p-5">
                  {hasLogo && (
                    <div className="flex items-center gap-3">
                      <AssetImage url={c.logo} label="logo" onView={() => openImg(c.logo)} />
                      <span className="text-xs text-[var(--color-text-muted)]">Client logo — click to view, hover to download</span>
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
                </div>
              </details>
            );
          })()}

          {/* project task switcher — group a project's tasks */}
          {p.project && (p.siblingTasks?.length ?? 0) > 1 && (
            <div className="mt-3">
              <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {p.siblingTasks.length} tasks in {p.project.name}
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {p.siblingTasks.map((t: any) => {
                  const active = t.id === task.id;
                  return (
                    <button key={t.id} onClick={() => p.navigate(`/tasks/${t.id}`)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? "border-[var(--card-hover-border)] bg-[var(--color-surface-3)] text-[var(--color-text-primary)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusDot(t.status) }} />
                      <span className="max-w-[150px] truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
            <div className="flex h-full flex-col items-center justify-center text-center">
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
                  <div id={it.kind === "msg" ? `task-comment-${d.id}` : undefined} className="flex gap-3 py-2 scroll-mt-20" style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold" style={avatarTint(role)}>{emoji ? <span className="text-base leading-none">{emoji}</span> : initials(name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{name}</span>
                        <StatusBadge dot={false} tone={roleTone(role)} className="!px-1.5 !py-0 text-[9px] uppercase tracking-wide">{roleLabel(role)}</StatusBadge>
                        <span className="ml-auto text-[11px] text-[var(--color-text-muted)]">{fmtTime(it.at)}</span>
                      </div>
                      {it.kind === "msg" ? (
                        <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{d.content}</p>
                      ) : (
                        <>
                          {d.caption && <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{d.caption}</p>}
                          <DeliverableCard file={d} p={p} />
                        </>
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
          <input ref={p.fileInputRef} type="file" className="hidden" onChange={(e) => p.setSelectedFile(e.target.files?.[0] || null)} />
          {p.selectedFile && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-1.5 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <span className="max-w-[200px] truncate">{p.selectedFile.name}</span>
              <button onClick={() => { p.setSelectedFile(null); if (p.fileInputRef.current) p.fileInputRef.current.value = ""; }} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-border-hover)] bg-[var(--color-surface-2)] py-1.5 pl-3 pr-1.5">
            <textarea
              rows={1}
              value={p.newComment}
              onChange={(e) => p.setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={p.selectedFile ? "Add a note for this file… (optional)" : "Write a message, or attach a deliverable…"}
              className="max-h-32 min-h-[24px] flex-1 resize-none !border-0 !bg-transparent !p-0 py-1.5 text-sm !shadow-none !ring-0 focus:!ring-0"
            />
            <button type="button" onClick={() => p.fileInputRef.current?.click()} aria-label="Attach file" className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]">
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={send} disabled={p.uploadingFile || p.addingComment || (!p.newComment.trim() && !p.selectedFile)} aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] transition disabled:opacity-40">
              {p.uploadingFile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-[17px] w-[17px]" />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3 px-1 text-[11px] text-[var(--color-text-muted)]">
            <button onClick={p.onRefresh} className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]"><RefreshCw className={`h-3 w-3 ${p.refreshing ? "animate-spin" : ""}`} /> Refresh</button>
            <span>Enter to send · Shift+Enter for a new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
