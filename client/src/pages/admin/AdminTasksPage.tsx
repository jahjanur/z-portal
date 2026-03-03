import React, { useState, useMemo } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import TaskForm from "../../components/admin/TaskForm";
import TasksList from "../../components/admin/TasksList";
import type { Task } from "../../contexts/AdminContext";

const colors = { primary: "" };

type StatusCategory = "pending" | "in_progress" | "completed";

export default function AdminTasksPage() {
  const { clients, workers, projects, tasks, createTask, handleCreateProject, deleteTask } = useAdmin();
  const [statusCategory, setStatusCategory] = useState<StatusCategory>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "erasphere">("all");
  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";

  const filterTasks = (taskList: Task[]) => {
    let out = taskList;
    if (categoryFilter === "erasphere") {
      out = out.filter((t) => t.client?.referredById != null);
    }
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
  };

  const pendingTasks = useMemo(
    () => filterTasks(tasks.filter((t) => t.status === "PENDING")),
    [tasks, categoryFilter, searchQuery]
  );
  const inProgressTasks = useMemo(
    () => filterTasks(tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL")),
    [tasks, categoryFilter, searchQuery]
  );
  const completedTasks = useMemo(
    () => filterTasks(tasks.filter((t) => t.status === "COMPLETED")),
    [tasks, categoryFilter, searchQuery]
  );

  const currentTasks =
    statusCategory === "pending"
      ? pendingTasks
      : statusCategory === "in_progress"
        ? inProgressTasks
        : completedTasks;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-4 shadow-xl backdrop-blur-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Tasks Management</h2>
        <TaskForm
          onSubmit={createTask}
          clients={clients}
          workers={workers}
          projects={projects}
          onCreateProject={handleCreateProject}
          hideWorkerAssignment={isEraSphere}
        />

        {/* Search and filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search tasks by title, description, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full max-w-sm rounded-xl px-4 py-2.5 text-sm"
            />
            {!isEraSphere && (
              <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    categoryFilter === "all"
                      ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("erasphere")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    categoryFilter === "erasphere"
                      ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                  }`}
                >
                  EraSphere only
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status category tabs: Pending | In Progress | Completed */}
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
              <svg className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                {searchQuery || categoryFilter !== "all"
                  ? "No tasks match your filters"
                  : statusCategory === "pending"
                    ? "No pending tasks"
                    : statusCategory === "in_progress"
                      ? "No tasks in progress"
                      : "No completed tasks yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
