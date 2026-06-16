import { useNavigate } from "react-router-dom";
import { Calendar, FolderKanban, Trash2, User as UserIcon } from "lucide-react";
import type { Task } from "../../contexts/AdminContext";

interface TaskBoardProps {
  tasks: Task[];
  onDelete: (id: number) => void;
  /** "board" = kanban columns, "list" = single dense list */
  view?: "board" | "list";
}

type ColumnKey = "pending" | "in_progress" | "completed";

const COLUMNS: {
  key: ColumnKey;
  label: string;
  match: (t: Task) => boolean;
  dot: string;
  accent: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    match: (t) => t.status === "PENDING",
    dot: "var(--color-warning-text)",
    accent: "var(--color-warning-border)",
  },
  {
    key: "in_progress",
    label: "In Progress",
    match: (t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL",
    dot: "var(--color-info-text)",
    accent: "var(--color-info-border)",
  },
  {
    key: "completed",
    label: "Completed",
    match: (t) => t.status === "COMPLETED",
    dot: "var(--color-success-text)",
    accent: "var(--color-success-border)",
  },
];

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

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
}: {
  task: Task;
  accent: string;
  onDelete: (id: number) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const completed = task.status === "COMPLETED";
  const dstate = dueState(task.dueDate, completed);
  const workers = task.workers ?? [];

  return (
    <article
      onClick={() => navigate(`/tasks/${task.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/tasks/${task.id}`);
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--card-hover-border)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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
                  title={tw.user.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-panel-solid)] bg-[var(--color-surface-3)] text-[0.625rem] font-bold text-[var(--color-text-secondary)]"
                >
                  {initials(tw.user.name)}
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

export default function TaskBoard({ tasks, onDelete, view = "board" }: TaskBoardProps) {
  const navigate = useNavigate();

  if (view === "list") {
    const ordered = [...tasks].sort((a, b) => {
      const order = { PENDING: 0, IN_PROGRESS: 1, PENDING_APPROVAL: 1, COMPLETED: 2 } as Record<string, number>;
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((t) => {
          const col = COLUMNS.find((c) => c.match(t)) ?? COLUMNS[0];
          return <TaskCard key={t.id} task={t} accent={col.accent} onDelete={onDelete} navigate={navigate} />;
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(col.match);
        return (
          <div key={col.key} className="flex min-w-0 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
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
                  No {col.label.toLowerCase()} tasks
                </div>
              ) : (
                colTasks.map((t) => (
                  <TaskCard key={t.id} task={t} accent={col.accent} onDelete={onDelete} navigate={navigate} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
