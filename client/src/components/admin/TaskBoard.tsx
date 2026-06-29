import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FolderKanban, Trash2, User as UserIcon } from "lucide-react";
import type { Task } from "../../contexts/AdminContext";
import { avatarGlyph } from "../../constants/workerProfile";
import ProgressBar from "../ui/ProgressBar";
import { milestoneProgress } from "../../utils/milestones";

interface TaskBoardProps {
  tasks: Task[];
  onDelete: (id: number) => void;
  /** "board" = kanban columns, "list" = single dense list */
  view?: "board" | "list";
  /** When provided, board cards can be dragged between columns to change status. */
  onChangeStatus?: (id: number, status: string) => void;
}

type ColumnKey = "pending" | "in_progress" | "completed";

const COLUMNS: {
  key: ColumnKey;
  label: string;
  match: (t: Task) => boolean;
  status: string; // canonical status set when a card is dropped here
  dot: string;
  accent: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    match: (t) => t.status === "PENDING",
    status: "PENDING",
    dot: "var(--color-warning-text)",
    accent: "var(--color-warning-border)",
  },
  {
    key: "in_progress",
    label: "In Progress",
    match: (t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL",
    status: "IN_PROGRESS",
    dot: "var(--color-info-text)",
    accent: "var(--color-info-border)",
  },
  {
    key: "completed",
    label: "Completed",
    match: (t) => t.status === "COMPLETED",
    status: "COMPLETED",
    dot: "var(--color-success-text)",
    accent: "var(--color-success-border)",
  },
];

function dueState(dueDate?: string, completed?: boolean): "none" | "overdue" | "soon" | "ok" {
  if (!dueDate) return "none";
  if (completed) return "ok";
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  if (due - now < 1000 * 60 * 60 * 24 * 3) return "soon";
  return "ok";
}

function TaskCard({
  task,
  accent,
  onDelete,
  navigate,
  draggable,
  onDragStart,
}: {
  task: Task;
  accent: string;
  onDelete: (id: number) => void;
  navigate: ReturnType<typeof useNavigate>;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const completed = task.status === "COMPLETED";
  const dstate = dueState(task.dueDate, completed);
  const workers = task.workers ?? [];

  return (
    <article
      onClick={() => navigate(`/tasks/${task.id}`)}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/tasks/${task.id}`);
        }
      }}
      className={`group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--card-hover-border)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      {/* status accent rail */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <h4 className="min-w-0 break-words pr-1 text-[0.9375rem] font-semibold leading-snug text-[var(--color-text-primary)]">
          {task.title}
        </h4>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete task "${task.title}"?`)) onDelete(task.id);
          }}
          aria-label={`Delete task: ${task.title}`}
          className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {task.project && (
        <div className="mt-2 pl-1.5">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--color-text-secondary)]">
            <FolderKanban className="h-3 w-3 shrink-0" />
            <span className="truncate">{task.project.name}</span>
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 pl-1.5 text-xs text-[var(--color-text-muted)]">
        <UserIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{task.client?.name ?? `Client #${task.clientId}`}</span>
      </div>

      {task.milestones && task.milestones.length > 0 && (() => {
        const { done, total, percent } = milestoneProgress(task.milestones);
        return (
          <div className="mt-3 flex items-center gap-2 pl-1.5">
            <ProgressBar percent={percent} size="xs" className="flex-1" />
            <span className="shrink-0 text-[0.6875rem] font-medium tabular-nums text-[var(--color-text-muted)]">{done}/{total}</span>
          </div>
        );
      })()}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pl-1.5 pt-3">
        {/* worker avatars */}
        <div className="flex items-center">
          {workers.length === 0 ? (
            <span className="text-[0.6875rem] text-[var(--color-placeholder)]">Unassigned</span>
          ) : (
            <div className="flex -space-x-2">
              {workers.slice(0, 3).map((tw, i) => (
                <span
                  key={i}
                  title={tw.user.nickname ? `${tw.user.name} (“${tw.user.nickname}”)` : tw.user.name}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-panel-solid)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] ${tw.user.avatarEmoji ? "text-xs" : "text-[0.625rem] font-bold"}`}
                >
                  {avatarGlyph(tw.user)}
                </span>
              ))}
              {workers.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-panel-solid)] bg-[var(--color-surface-3)] text-[0.625rem] font-bold text-[var(--color-text-muted)]">
                  +{workers.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {task.dueDate && (
          <span
            className={`inline-flex items-center gap-1 text-[0.6875rem] font-medium ${
              dstate === "overdue"
                ? "text-[var(--color-destructive-text)]"
                : dstate === "soon"
                  ? "text-[var(--color-warning-text)]"
                  : "text-[var(--color-text-muted)]"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </article>
  );
}

export default function TaskBoard({ tasks, onDelete, view = "board", onChangeStatus }: TaskBoardProps) {
  const navigate = useNavigate();
  const [dragOverCol, setDragOverCol] = useState<ColumnKey | null>(null);
  const dnd = !!onChangeStatus;

  if (view === "list") {
    const ordered = [...tasks].sort((a, b) => {
      const order = { PENDING: 0, IN_PROGRESS: 1, PENDING_APPROVAL: 1, COMPLETED: 2 } as Record<string, number>;
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
    if (ordered.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-text-muted)]">
          No tasks found
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        {ordered.map((t) => {
          const col = COLUMNS.find((c) => c.match(t)) ?? COLUMNS[0];
          const completed = t.status === "COMPLETED";
          const dstate = dueState(t.dueDate, completed);
          const workers = t.workers ?? [];
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/tasks/${t.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/tasks/${t.id}`); } }}
              className="group flex cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-3 py-3 transition-colors last:border-0 hover:bg-[var(--color-surface-2)] sm:px-4"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.dot }} title={col.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{t.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--color-text-muted)]">
                  <span className="truncate">{t.client?.name ?? `Client #${t.clientId}`}</span>
                  {t.project && (<><span className="opacity-40">·</span><span className="inline-flex min-w-0 items-center gap-1"><FolderKanban className="h-3 w-3 shrink-0" /><span className="truncate">{t.project.name}</span></span></>)}
                </p>
              </div>
              {/* workers */}
              <div className="hidden shrink-0 sm:flex sm:-space-x-2">
                {workers.slice(0, 3).map((tw, i) => (
                  <span key={i} title={tw.user.nickname ? `${tw.user.name} (“${tw.user.nickname}”)` : tw.user.name} className={`flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-panel-solid)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] ${tw.user.avatarEmoji ? "text-xs" : "text-[0.625rem] font-bold"}`}>{avatarGlyph(tw.user)}</span>
                ))}
                {workers.length > 3 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-panel-solid)] bg-[var(--color-surface-3)] text-[0.625rem] font-bold text-[var(--color-text-muted)]">+{workers.length - 3}</span>
                )}
              </div>
              {/* due */}
              {t.dueDate && (
                <span className={`hidden shrink-0 items-center gap-1 text-xs font-medium md:inline-flex ${dstate === "overdue" ? "text-[var(--color-destructive-text)]" : dstate === "soon" ? "text-[var(--color-warning-text)]" : "text-[var(--color-text-muted)]"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
              <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col.label}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete task "${t.title}"?`)) onDelete(t.id); }}
                aria-label={`Delete task: ${t.title}`}
                className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(col.match);
        const isOver = dragOverCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={dnd ? (e) => { e.preventDefault(); if (dragOverCol !== col.key) setDragOverCol(col.key); } : undefined}
            onDragLeave={dnd ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); } : undefined}
            onDrop={dnd ? (e) => {
              e.preventDefault();
              const id = Number(e.dataTransfer.getData("text/plain"));
              setDragOverCol(null);
              if (id) onChangeStatus?.(id, col.status);
            } : undefined}
            className={`flex min-w-0 flex-col rounded-2xl border bg-[var(--color-surface-2)] transition-colors ${isOver ? "border-[var(--card-hover-border)] bg-[var(--color-surface-3)] ring-2 ring-[var(--color-focus-ring)]" : "border-[var(--color-border)]"}`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.dot }} aria-hidden />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{col.label}</h3>
              </div>
              <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
                {colTasks.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">
              {colTasks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-10 text-center text-xs text-[var(--color-text-muted)]">
                  {isOver ? `Drop to mark ${col.label}` : `No ${col.label.toLowerCase()} tasks`}
                </div>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    accent={col.accent}
                    onDelete={onDelete}
                    navigate={navigate}
                    draggable={dnd}
                    onDragStart={dnd ? (e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; } : undefined}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
