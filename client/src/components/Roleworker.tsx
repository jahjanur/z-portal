import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, ChevronDown } from "lucide-react";
import API from "../api";
import PageHeader from "./ui/PageHeader";
import StatCard from "./ui/StatCard";
import StatusBadge from "./ui/StatusBadge";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";
import SectionCard from "./ui/SectionCard";
import TaskListRow from "./ui/TaskListRow";
import { SkeletonDashboard } from "./ui/Skeleton";
import ProgressBar from "./user/ProgressBar";
import { milestoneProgress } from "../utils/milestones";

/** The three status lanes (matches the admin board's grouping). */
const STATUS_GROUPS: { key: string; label: string; match: (s?: string | null) => boolean; dot: string }[] = [
  { key: "pending", label: "Pending", match: (s) => (s ?? "").toUpperCase() === "PENDING", dot: "var(--color-warning-text)" },
  { key: "in_progress", label: "In Progress", match: (s) => { const u = (s ?? "").toUpperCase(); return u === "IN_PROGRESS" || u === "PENDING_APPROVAL"; }, dot: "var(--color-info-text)" },
  { key: "completed", label: "Completed", match: (s) => (s ?? "").toUpperCase() === "COMPLETED", dot: "var(--color-success-text)" },
];

interface Client {
  id: number;
  name: string;
  company?: string | null;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  clientId: number;
  status?: string | null;
  dueDate?: string | null;
  createdAt: string;
  client?: Client;
  projectId?: number | null;
  project?: { id: number; name: string } | null;
  milestones?: { id: number; isDone: boolean }[] | null;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
] as const;

const RoleWorker: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: "overview" | "tasks" = tabParam === "tasks" ? "tasks" : "overview";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (k: string) =>
    setCollapsedFolders((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (activeTab === "tasks") {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get<Task[]>("/tasks");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const completedTasks = tasks.filter(t => t.status?.toUpperCase() === "COMPLETED").length;
  const inProgressTasks = tasks.filter(t => t.status?.toUpperCase() === "IN_PROGRESS").length;
  const pendingTasks = tasks.filter(t => t.status?.toUpperCase() === "PENDING").length;
  const overdueTasks = tasks.filter(t => {
    const days = getDaysUntilDue(t.dueDate);
    return days !== null && days < 0 && t.status?.toUpperCase() !== "COMPLETED";
  }).length;

  const upcomingTasks = tasks.filter(t => {
    const days = getDaysUntilDue(t.dueDate);
    return days !== null && days >= 0 && days <= 7 && t.status?.toUpperCase() !== "COMPLETED";
  }).length;

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "ALL" || task.status?.toUpperCase() === statusFilter;
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const firstName = (localStorage.getItem("name") || "").trim().split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const renderTaskCard = (task: Task) => {
    const daysUntil = getDaysUntilDue(task.dueDate);
    const isOverdue = daysUntil !== null && daysUntil < 0 && task.status?.toUpperCase() !== "COMPLETED";
    const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
    const prog = task.milestones && task.milestones.length > 0 ? milestoneProgress(task.milestones) : null;

    return (
      <div
        key={task.id}
        onClick={() => navigate(`/tasks/${task.id}`)}
        className={`card-panel card-panel-hover cursor-pointer p-4 sm:p-5 ${
          isOverdue ? "border-[var(--color-destructive-border)]" : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">{task.title}</h3>
            {task.description && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{task.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)]">
              {task.client && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium text-[var(--color-text-secondary)]">{task.client.name}</span>
                </span>
              )}
              {task.dueDate && (
                isOverdue ? (
                  <span className="badge badge-danger">Overdue by {Math.abs(daysUntil!)} days</span>
                ) : isDueSoon ? (
                  <span className="badge badge-warning">Due in {daysUntil} days</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Due: {formatDate(task.dueDate)}</span>
                  </span>
                )
              )}
            </div>
            {prog && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full bg-[var(--color-info-text)] transition-all" style={{ width: `${prog.percent}%` }} />
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--color-text-muted)]">{prog.done}/{prog.total}</span>
              </div>
            )}
          </div>
          <StatusBadge status={task.status} className="shrink-0 self-start" />
        </div>
      </div>
    );
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md animate-fade-up pt-10">
        <div className="rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-5 text-center sm:p-6">
          <p className="text-base font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={fetchTasks}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        subtitle="Track and manage your assigned tasks."
      >
        {/* Tab pills — segmented control */}
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 shadow-elev-sm">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchParams({ tab: key })}
                aria-current={activeTab === key ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === key
                    ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
            <StatCard
              label="Total Tasks"
              value={tasks.length}
              hint={`${completedTasks} completed`}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <StatCard
              label="In Progress"
              value={inProgressTasks}
              hint="Active work"
              tone="info"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Overdue"
              value={overdueTasks}
              hint="Need attention"
              tone="danger"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatCard
              label="Due This Week"
              value={upcomingTasks}
              hint="Next 7 days"
              tone="warning"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

          {/* Task Progress */}
          <SectionCard title="Task Progress" bodyClassName="space-y-4">
            <ProgressBar label="Completed" current={completedTasks} total={tasks.length} />
            <ProgressBar label="In Progress" current={inProgressTasks} total={tasks.length} />
            <ProgressBar label="Pending" current={pendingTasks} total={tasks.length} />
          </SectionCard>

          {/* Recent & Priority Tasks */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Overdue Tasks */}
            {overdueTasks > 0 && (
              <SectionCard
                title="Overdue Tasks"
                tone="danger"
                bodyClassName="space-y-3"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              >
                {tasks
                  .filter(t => {
                    const days = getDaysUntilDue(t.dueDate);
                    return days !== null && days < 0 && t.status?.toUpperCase() !== "COMPLETED";
                  })
                  .slice(0, 5)
                  .map((task) => {
                    const daysUntil = getDaysUntilDue(task.dueDate);
                    return (
                      <TaskListRow
                        key={task.id}
                        title={task.title}
                        subtitle={task.client?.name || "No client"}
                        status={task.status}
                        danger
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        badge={<span className="badge badge-danger">Overdue by {Math.abs(daysUntil!)} days</span>}
                      />
                    );
                  })}
              </SectionCard>
            )}

            {/* Recent Tasks */}
            <SectionCard
              title="Recent Tasks"
              bodyClassName="space-y-3"
              footer={
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setSearchParams({ tab: "tasks" })}
                >
                  View All Tasks
                </Button>
              }
            >
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No tasks yet</p>
              ) : (
                tasks.slice(0, 5).map((task) => {
                  const daysUntil = getDaysUntilDue(task.dueDate);
                  const isOverdue = daysUntil !== null && daysUntil < 0 && task.status?.toUpperCase() !== "COMPLETED";
                  return (
                    <TaskListRow
                      key={task.id}
                      title={task.title}
                      subtitle={task.client?.name || "No client"}
                      status={task.status}
                      danger={isOverdue}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      badge={
                        isOverdue ? (
                          <span className="badge badge-danger">Overdue by {Math.abs(daysUntil!)} days</span>
                        ) : undefined
                      }
                    />
                  );
                })
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === status
                      ? "border-[var(--color-tab-active-border)] bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] md:w-64"
            />
          </div>

          {/* Tasks grouped into project folders, each with its status flow */}
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description="Try adjusting your filters"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          ) : (
            (() => {
              // group filtered tasks into project folders (+ a Standalone bucket)
              const map = new Map<string, { key: string; name: string; tasks: Task[] }>();
              const order: string[] = [];
              const standalone: Task[] = [];
              for (const t of filteredTasks) {
                if (t.projectId) {
                  const key = String(t.projectId);
                  let g = map.get(key);
                  if (!g) { g = { key, name: t.project?.name ?? `Project #${t.projectId}`, tasks: [] }; map.set(key, g); order.push(key); }
                  g.tasks.push(t);
                } else {
                  standalone.push(t);
                }
              }
              const folders = order.map((k) => map.get(k)!).sort((a, b) => a.name.localeCompare(b.name));
              if (standalone.length) folders.push({ key: "standalone", name: "Standalone tasks", tasks: standalone });

              return (
                <div className="space-y-4">
                  {folders.map((f) => {
                    const collapsed = collapsedFolders.has(f.key);
                    return (
                      <section key={f.key} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
                        <button
                          type="button"
                          onClick={() => toggleFolder(f.key)}
                          aria-expanded={!collapsed}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--color-surface-2)] ${collapsed ? "" : "border-b border-[var(--color-border)]"}`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                            <FolderKanban className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
                            <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">{f.name}</h3>
                            <span className="shrink-0 rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
                              {f.tasks.length}
                            </span>
                          </div>
                          <div className="hidden shrink-0 items-center gap-3 text-xs font-medium text-[var(--color-text-muted)] sm:flex">
                            {STATUS_GROUPS.map((g) => {
                              const n = f.tasks.filter((t) => g.match(t.status)).length;
                              return (
                                <span key={g.key} className="inline-flex items-center gap-1.5" title={g.label}>
                                  <span className="h-2 w-2 rounded-full" style={{ background: g.dot }} aria-hidden />
                                  <span className="tabular-nums">{n}</span>
                                </span>
                              );
                            })}
                          </div>
                        </button>
                        {!collapsed && (
                          <div className="space-y-5 p-3 sm:p-4">
                            {STATUS_GROUPS.map((g) => {
                              const gtasks = f.tasks.filter((t) => g.match(t.status));
                              if (gtasks.length === 0) return null;
                              return (
                                <div key={g.key} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.dot }} aria-hidden />
                                    <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{g.label}</h4>
                                    <span className="text-xs font-medium tabular-nums text-[var(--color-text-muted)]">{gtasks.length}</span>
                                  </div>
                                  <div className="space-y-3">
                                    {gtasks.map(renderTaskCard)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};

export default RoleWorker;
