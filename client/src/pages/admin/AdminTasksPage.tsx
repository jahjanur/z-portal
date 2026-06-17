import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import TaskForm from "../../components/admin/TaskForm";
import TaskBoard from "../../components/admin/TaskBoard";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { CONTROL_INPUT, CONTROL_SELECT, CONTROL_TEXTAREA, CONTROL_LABEL } from "../../components/ui/controls";
import { LayoutGrid, List, Plus, FolderKanban, Pencil, Trash2, Search, ExternalLink, ClipboardList } from "lucide-react";
import type { Project } from "../../contexts/AdminContext";
import { ServiceTypePicker, ServiceFieldsForm, ServiceBadge, ServiceSummaryView } from "../../components/admin/ServiceFields";
import type { ServiceType } from "../../utils/serviceTypes";
import { playSuccessSound } from "../../utils/sound";

export default function AdminTasksPage() {
  const {
    clients, workers, projects, tasks,
    adminOwnClients, adminOwnTasks,
    createTask, handleCreateProject, updateProject, deleteProject, deleteTask, updateTaskStatus,
  } = useAdmin();

  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  // Manage-projects modal state
  const emptyProj = { name: "", clientId: "", description: "", serviceType: "OTHER", metadata: {} as Record<string, unknown> };
  const [newProj, setNewProj] = useState(emptyProj);
  const [creatingProj, setCreatingProj] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProj, setEditProj] = useState({ name: "", description: "", status: "ACTIVE", serviceType: "OTHER", metadata: {} as Record<string, unknown> });
  const [savingEdit, setSavingEdit] = useState(false);

  const baseTasks = isAdmin ? adminOwnTasks : tasks;
  const formClients = isAdmin ? adminOwnClients : clients;

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseTasks.filter((t) => {
      if (projectFilter === "standalone" && t.projectId) return false;
      if (projectFilter !== "all" && projectFilter !== "standalone" && String(t.projectId ?? "") !== projectFilter) return false;
      if (!q) return true;
      return (
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.client?.name?.toLowerCase().includes(q) ||
        t.client?.company?.toLowerCase().includes(q)
      );
    });
  }, [baseTasks, searchQuery, projectFilter]);

  const counts = useMemo(() => ({
    total: filteredTasks.length,
    pending: filteredTasks.filter((t) => t.status === "PENDING").length,
    active: filteredTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL").length,
    done: filteredTasks.filter((t) => t.status === "COMPLETED").length,
  }), [filteredTasks]);

  const submitTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data);
    // Audible confirmation for your own action (incoming-notification sounds
    // only fire for the recipient, never the creator).
    playSuccessSound();
    toast.success("Task created");
    setShowCreate(false);
  };

  const createProject = async () => {
    if (!newProj.name.trim()) { toast.error("Project name is required"); return; }
    setCreatingProj(true);
    try {
      await handleCreateProject(newProj);
      setNewProj(emptyProj);
    } finally {
      setCreatingProj(false);
    }
  };

  const beginEdit = (p: Project) => {
    setEditingProject(p);
    setEditProj({
      name: p.name,
      description: p.description ?? "",
      status: (p as { status?: string }).status ?? "ACTIVE",
      serviceType: p.serviceType ?? "OTHER",
      metadata: (p.metadata as Record<string, unknown>) ?? {},
    });
  };

  const saveEdit = async () => {
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      await updateProject(editingProject.id, editProj);
      setEditingProject(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const viewBtn = (key: "board" | "list", label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      onClick={() => setView(key)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        view === key
          ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      }`}
      aria-pressed={view === key}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Plan, assign and track work across clients and projects"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setShowProjects(true)}>
              <FolderKanban className="h-4 w-4" />
              Projects
              <span className="ml-1 rounded-full bg-[var(--color-surface-3)] px-1.5 text-xs">{projects.length}</span>
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        }
      />

      {/* Unified control bar */}
      <div className="card-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            placeholder="Search tasks, clients…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${CONTROL_INPUT} w-full !pl-9`}
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className={`${CONTROL_SELECT} sm:w-56`}
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          <option value="standalone">Standalone (no project)</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
          {viewBtn("board", "Board", LayoutGrid)}
          {viewBtn("list", "List", List)}
        </div>
        {isAdmin && (
          <Link
            to="/admin/erasphere/tasks"
            className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] lg:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            EraSphere
          </Link>
        )}
      </div>

      {/* Board / list */}
      {filteredTasks.length > 0 ? (
        <TaskBoard tasks={filteredTasks} onDelete={deleteTask} view={view} onChangeStatus={updateTaskStatus} />
      ) : (
        <EmptyState
          title={searchQuery || projectFilter !== "all" ? "No matching tasks" : "No tasks yet"}
          description={
            searchQuery || projectFilter !== "all"
              ? "Try clearing the search or project filter."
              : "Create your first task to get started."
          }
          icon={<ClipboardList className="h-6 w-6" />}
          action={
            !searchQuery && projectFilter === "all" ? (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> New Task
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Footer summary */}
      <p className="px-1 text-xs text-[var(--color-text-muted)]">
        {counts.total} task{counts.total !== 1 ? "s" : ""} · {counts.pending} pending · {counts.active} in progress · {counts.done} completed
      </p>

      {/* Create task slide-over */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Task" maxWidth="2xl">
        <TaskForm
          onSubmit={submitTask}
          clients={formClients}
          workers={workers}
          projects={projects}
          onCreateProject={handleCreateProject}
          hideWorkerAssignment={isEraSphere}
          embedded
        />
      </Modal>

      {/* Manage projects */}
      <Modal isOpen={showProjects} onClose={() => setShowProjects(false)} title="Manage Projects" maxWidth="2xl">
        <div className="space-y-5">
          {/* create */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <h4 className="section-title mb-3">New project</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={CONTROL_LABEL}>Project name *</label>
                <input value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} className={CONTROL_INPUT} placeholder="Website redesign" />
              </div>
              <div>
                <label className={CONTROL_LABEL}>Client</label>
                <select value={newProj.clientId} onChange={(e) => setNewProj({ ...newProj, clientId: e.target.value })} className={CONTROL_SELECT}>
                  <option value="">No client (standalone)</option>
                  {formClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={CONTROL_LABEL}>Description</label>
                <input value={newProj.description} onChange={(e) => setNewProj({ ...newProj, description: e.target.value })} className={CONTROL_INPUT} placeholder="Optional" />
              </div>
            </div>
            <div className="mt-4">
              <label className={CONTROL_LABEL}>Service type</label>
              <ServiceTypePicker value={newProj.serviceType} onChange={(t: ServiceType) => setNewProj({ ...newProj, serviceType: t, metadata: {} })} />
            </div>
            <div className="mt-4">
              <ServiceFieldsForm serviceType={newProj.serviceType} metadata={newProj.metadata} onChange={(m) => setNewProj({ ...newProj, metadata: m })} />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" size="sm" loading={creatingProj} onClick={createProject}>
                <Plus className="h-4 w-4" /> Create project
              </Button>
            </div>
          </div>

          {/* list */}
          <div>
            <h4 className="section-title mb-3">All projects ({projects.length})</h4>
            {projects.length === 0 ? (
              <EmptyState compact title="No projects yet" description="Create one above to group related tasks." icon={<FolderKanban className="h-6 w-6" />} />
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                    {editingProject?.id === p.id ? (
                      <div className="space-y-3">
                        <input value={editProj.name} onChange={(e) => setEditProj({ ...editProj, name: e.target.value })} className={CONTROL_INPUT} />
                        <textarea value={editProj.description} onChange={(e) => setEditProj({ ...editProj, description: e.target.value })} rows={2} className={CONTROL_TEXTAREA} />
                        <ServiceTypePicker value={editProj.serviceType} onChange={(t: ServiceType) => setEditProj({ ...editProj, serviceType: t, metadata: editProj.serviceType === t ? editProj.metadata : {} })} />
                        <ServiceFieldsForm serviceType={editProj.serviceType} metadata={editProj.metadata} onChange={(m) => setEditProj({ ...editProj, metadata: m })} />
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={editProj.status} onChange={(e) => setEditProj({ ...editProj, status: e.target.value })} className={`${CONTROL_SELECT} flex-1`}>
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                          <Button variant="secondary" size="sm" onClick={() => setEditingProject(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" loading={savingEdit} onClick={saveEdit}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                              <ServiceBadge serviceType={p.serviceType} />
                            </div>
                            <p className="truncate text-xs text-[var(--color-text-muted)]">
                              {p.client ? `${p.client.name}${p.client.company ? ` — ${p.client.company}` : ""}` : "Standalone"}
                              {p.description ? ` · ${p.description}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => { setShowProjects(false); navigate(`/admin/zulbera/services/${p.id}`); }} aria-label="Open service" className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]">
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <button onClick={() => beginEdit(p)} aria-label="Edit project" className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => { if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id); }} aria-label="Delete project" className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)]">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <ServiceSummaryView serviceType={p.serviceType} metadata={p.metadata} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
