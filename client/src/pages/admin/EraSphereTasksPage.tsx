import { useMemo, useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import TasksList from "../../components/admin/TasksList";

const colors = { primary: "" };

type StatusCategory = "pending" | "in_progress" | "completed";

export default function EraSphereTasksPage() {
  const { tasks, deleteTask, loading } = useAdmin();
  const [statusCategory, setStatusCategory] = useState<StatusCategory>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const erasphereTasks = useMemo(() => {
    let out = tasks.filter((t) => t.client?.referredById != null);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.client?.name?.toLowerCase().includes(q) ||
          t.client?.company?.toLowerCase().includes(q)
      );
    }
    return out;
  }, [tasks, searchQuery]);

  const pendingTasks = useMemo(() => erasphereTasks.filter((t) => t.status === "PENDING"), [erasphereTasks]);
  const inProgressTasks = useMemo(
    () => erasphereTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL"),
    [erasphereTasks]
  );
  const completedTasks = useMemo(() => erasphereTasks.filter((t) => t.status === "COMPLETED"), [erasphereTasks]);

  const currentTasks =
    statusCategory === "pending"
      ? pendingTasks
      : statusCategory === "in_progress"
        ? inProgressTasks
        : completedTasks;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Tasks</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl card-panel p-8">
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Tasks</h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Tasks for clients referred by EraSphere partners. Create or edit tasks from the main Dashboard → Tasks (filter: EraSphere only).
        </p>

        <div className="mb-6">
          <input
            type="search"
            placeholder="Search tasks by title, description, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full max-w-sm rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div className="mb-4 flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
          <button
            type="button"
            onClick={() => setStatusCategory("pending")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              statusCategory === "pending"
                ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusCategory("in_progress")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              statusCategory === "in_progress"
                ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
            }`}
          >
            In Progress ({inProgressTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusCategory("completed")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              statusCategory === "completed"
                ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>

        <div className="mt-4">
          {currentTasks.length > 0 ? (
            <TasksList tasks={currentTasks} onDelete={deleteTask} colors={colors} />
          ) : (
            <div className="card-panel py-12 text-center rounded-xl">
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                {searchQuery ? "No tasks match your search." : "No EraSphere tasks in this category."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
