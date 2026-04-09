import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../contexts/AdminContext";
import TaskForm from "../../components/admin/TaskForm";
import TasksList from "../../components/admin/TasksList";
import type { Task, Project } from "../../contexts/AdminContext";

const colors = { primary: "" };

type StatusCategory = "pending" | "in_progress" | "completed";

export default function AdminTasksPage() {
  const { clients, workers, projects, tasks, adminOwnClients, adminOwnTasks, createTask, handleCreateProject, updateProject, deleteProject, deleteTask } = useAdmin();
  const [statusCategory, setStatusCategory] = useState<StatusCategory>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showProjects, setShowProjects] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjName, setEditProjName] = useState("");
  const [editProjDescription, setEditProjDescription] = useState("");
  const [editProjStatus, setEditProjStatus] = useState("");
  const [editProjSaving, setEditProjSaving] = useState(false);
  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";
  const isAdmin = localStorage.getItem("role") === "ADMIN";

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    setEditProjName(p.name);
    setEditProjDescription(p.description ?? "");
    setEditProjStatus((p as any).status ?? "ACTIVE");
  };

  const saveEditProject = async () => {
    if (!editingProject) return;
    setEditProjSaving(true);
    try {
      await updateProject(editingProject.id, {
        name: editProjName,
        description: editProjDescription,
        status: editProjStatus,
      });
      setEditingProject(null);
    } finally {
      setEditProjSaving(false);
    }
  };

  const baseTasks = isAdmin ? adminOwnTasks : tasks;
  const formClients = isAdmin ? adminOwnClients : clients;

  const filterTasks = (taskList: Task[]) => {
    if (!searchQuery.trim()) return taskList;
    const q = searchQuery.trim().toLowerCase();
    return taskList.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.client?.name?.toLowerCase().includes(q) ||
        t.client?.company?.toLowerCase().includes(q)
    );
  };

  const pendingTasks = useMemo(
    () => filterTasks(baseTasks.filter((t) => t.status === "PENDING")),
    [baseTasks, searchQuery]
  );
  const inProgressTasks = useMemo(
    () => filterTasks(baseTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL")),
    [baseTasks, searchQuery]
  );
  const completedTasks = useMemo(
    () => filterTasks(baseTasks.filter((t) => t.status === "COMPLETED")),
    [baseTasks, searchQuery]
  );

  const currentTasks =
    statusCategory === "pending"
      ? pendingTasks
      : statusCategory === "in_progress"
        ? inProgressTasks
        : completedTasks;

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Tasks Management</h2>
        <TaskForm
          onSubmit={createTask}
          clients={formClients}
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
            {isAdmin && (
              <Link
                to="/admin/erasphere/tasks"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                EraSphere Tasks
              </Link>
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
                {searchQuery
                  ? "No tasks match your search"
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

      {/* Projects section */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowProjects(!showProjects)}
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-colors hover:bg-[var(--color-surface-3)]"
        >
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Projects <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({projects.length})</span>
          </h3>
          <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showProjects ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showProjects && (
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No projects yet</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl card-panel p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                    {p.client && (
                      <p className="text-xs text-[var(--color-text-muted)]">{p.client.name}{p.client.company ? ` — ${p.client.company}` : ""}</p>
                    )}
                    {p.description && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate max-w-xs">{p.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => openEditProject(p)}
                      className="btn-secondary h-8 px-3 text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProject(p.id)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Project edit modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingProject(null)}>
          <div className="rounded-2xl card-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Project</h3>
              <button type="button" onClick={() => setEditingProject(null)} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
                <input value={editProjName} onChange={(e) => setEditProjName(e.target.value)} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
                <textarea value={editProjDescription} onChange={(e) => setEditProjDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
                <select value={editProjStatus} onChange={(e) => setEditProjStatus(e.target.value)} className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingProject(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="button" onClick={saveEditProject} disabled={editProjSaving} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                  {editProjSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
