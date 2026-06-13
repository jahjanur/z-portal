import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import { SkeletonDashboard } from "../components/ui/Skeleton";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "PENDING_APPROVAL";
  dueDate?: string;
  createdAt: string;
  client?: { name: string; id: number };
  workers?: { user: { name: string; id: number } }[];
}

const PILL_ACTIVE =
  "rounded-full bg-[var(--color-nav-active-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-nav-active-text)] shadow-elev-sm transition-colors";
const PILL_INACTIVE =
  "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]";

export default function TasksOverview() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "pending" | "pending_approval">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await API.get<Task[]>("/tasks");
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && task.status === "COMPLETED") ||
      (filter === "in_progress" && task.status === "IN_PROGRESS") ||
      (filter === "pending" && task.status === "PENDING") ||
      (filter === "pending_approval" && task.status === "PENDING_APPROVAL");

    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.workers?.some((tw) => tw.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);

    return matchesFilter && matchesSearch;
  });

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter(t => t.status === "PENDING").length;
  const pendingApprovalCount = tasks.filter(t => t.status === "PENDING_APPROVAL").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Task Overview"
          subtitle="Monitor task progress and completion rates"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 stagger-children">
          <StatCard
            label="Completion Rate"
            value={`${completionRate}%`}
            tone="success"
            hint={`${completedCount} of ${tasks.length}`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard label="Completed" value={completedCount} tone="success" />
          <StatCard label="In Progress" value={inProgressCount} tone="info" />
          <StatCard label="Pending" value={pendingCount} tone="warning" />
          <StatCard label="Need Approval" value={pendingApprovalCount} />
        </div>

        {/* Filters and search */}
        <div className="card-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter("all")} className={filter === "all" ? PILL_ACTIVE : PILL_INACTIVE}>
              All ({tasks.length})
            </button>
            <button onClick={() => setFilter("completed")} className={filter === "completed" ? PILL_ACTIVE : PILL_INACTIVE}>
              Completed ({completedCount})
            </button>
            <button onClick={() => setFilter("in_progress")} className={filter === "in_progress" ? PILL_ACTIVE : PILL_INACTIVE}>
              In Progress ({inProgressCount})
            </button>
            <button onClick={() => setFilter("pending")} className={filter === "pending" ? PILL_ACTIVE : PILL_INACTIVE}>
              Pending ({pendingCount})
            </button>
            <button onClick={() => setFilter("pending_approval")} className={filter === "pending_approval" ? PILL_ACTIVE : PILL_INACTIVE}>
              Approval ({pendingApprovalCount})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full rounded-xl px-4 py-2 pl-10 text-sm md:w-64"
            />
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tasks list */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No tasks found"
            description="Try adjusting your filters or search query"
          />
        ) : (
          <div className="space-y-3 stagger-children">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="card-panel card-panel-hover flex cursor-pointer flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-[var(--color-text-primary)] sm:text-lg">{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>

                  {task.description && (
                    <p className="mb-3 text-sm text-[var(--color-text-muted)] line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
                    {task.client && (
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{task.client.name}</span>
                      </div>
                    )}

                    {task.workers && task.workers.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{task.workers.map((tw) => tw.user.name).join(", ")}</span>
                      </div>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Due {formatDate(task.dueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
