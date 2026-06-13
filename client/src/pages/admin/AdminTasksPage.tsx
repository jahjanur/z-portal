import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../contexts/AdminContext";
import TaskForm from "../../components/admin/TaskForm";
import TasksList from "../../components/admin/TasksList";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { CONTROL_INPUT, CONTROL_SELECT, CONTROL_TEXTAREA, CONTROL_LABEL } from "../../components/ui/controls";
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
  const formRef = useRef<HTMLDivElement>(null);

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

  const statusTabs: { key: StatusCategory; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pendingTasks.length },
    { key: "in_progress", label: "In Progress", count: inProgressTasks.length },
    { key: "completed", label: "Completed", count: completedTasks.length },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Create, assign and track tasks across clients and projects"
        actions={
          <Button
            variant="primary"
            onClick={() =>
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </Button>
        }
      />

      <div ref={formRef} className="scroll-mt-24">
        <TaskForm
          onSubmit={createTask}
          clients={formClients}
          workers={workers}
          projects={projects}
          onCreateProject={handleCreateProject}
          hideWorkerAssignment={isEraSphere}
        />
      </div>

      <div className="card-panel p-5 sm:p-6">
        {/* Search and filters */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search tasks by title, description, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${CONTROL_INPUT} w-full sm:max-w-sm`}
          />
          {isAdmin && (
            <Link
              to="/admin/erasphere/tasks"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] sm:self-auto"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              EraSphere Tasks
            </Link>
          )}
        </div>

        {/* Status category tabs: Pending | In Progress | Completed */}
        <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
          <div className="inline-flex w-full min-w-max gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 sm:min-w-0">
            {statusTabs.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusCategory(key)}
                className={`flex-1 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  statusCategory === key
                    ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] shadow-elev-sm"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {currentTasks.length > 0 ? (
            <TasksList tasks={currentTasks} onDelete={deleteTask} colors={colors} />
          ) : (
            <EmptyState
              compact
              title={
                searchQuery
                  ? "No tasks match your search"
                  : statusCategory === "pending"
                    ? "No pending tasks"
                    : statusCategory === "in_progress"
                      ? "No tasks in progress"
                      : "No completed tasks yet"
              }
              description={searchQuery ? "Try a different search term." : "Tasks will appear here once created."}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {/* Projects section */}
      <section>
        <button
          type="button"
          onClick={() => setShowProjects(!showProjects)}
          className="card-panel row-hover mb-4 flex w-full items-center justify-between p-4 text-left"
          aria-expanded={showProjects}
        >
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Projects <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({projects.length})</span>
          </h3>
          <svg className={`h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${showProjects ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showProjects && (
          <div className="stagger-children space-y-3">
            {projects.length === 0 ? (
              <EmptyState
                compact
                title="No projects yet"
                description="Create a project from the task form above to group related tasks."
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                }
              />
            ) : (
              projects.map((p) => (
                <div key={p.id} className="card-panel row-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                    {p.client && (
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{p.client.name}{p.client.company ? ` — ${p.client.company}` : ""}</p>
                    )}
                    {p.description && (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{p.description}</p>
                    )}
                  </div>
                  <div className="flex w-full gap-2 sm:ml-4 sm:w-auto sm:shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => openEditProject(p)}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => deleteProject(p.id)}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Project edit modal */}
      <Modal
        isOpen={editingProject !== null}
        onClose={() => setEditingProject(null)}
        title="Edit Project"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className={CONTROL_LABEL}>Name</label>
            <input
              value={editProjName}
              onChange={(e) => setEditProjName(e.target.value)}
              className={CONTROL_INPUT}
            />
          </div>
          <div>
            <label className={CONTROL_LABEL}>Description</label>
            <textarea
              value={editProjDescription}
              onChange={(e) => setEditProjDescription(e.target.value)}
              rows={3}
              className={CONTROL_TEXTAREA}
            />
          </div>
          <div>
            <label className={CONTROL_LABEL}>Status</label>
            <select
              value={editProjStatus}
              onChange={(e) => setEditProjStatus(e.target.value)}
              className={CONTROL_SELECT}
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setEditingProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={editProjSaving}
              className="w-full sm:w-auto"
              onClick={saveEditProject}
            >
              {editProjSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
