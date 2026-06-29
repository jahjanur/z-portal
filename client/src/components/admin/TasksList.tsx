import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Pagination from "../ui/Pagination";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

interface User {
  name: string;
  company?: string;
  avatarEmoji?: string | null;
  nickname?: string | null;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
  clientId: number;
  dueDate?: string;
  status: string;
  projectId?: number;
  client?: User;
  workers?: { user: User }[];
  project?: Project;
}

interface TasksListProps {
  tasks: Task[];
  onDelete: (id: number) => void;
  colors: { primary: string };
}

const PAGE_SIZE = 10;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "withProject", label: "In Projects" },
  { key: "standalone", label: "Standalone" },
] as const;

const TasksList: React.FC<TasksListProps> = ({ tasks, onDelete }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"all" | "grouped">("all");
  const [filter, setFilter] = useState<"all" | "withProject" | "standalone">("all");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const effectiveViewMode = filter === "withProject" ? "grouped" : viewMode;

  const toggleProject = (key: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedProjects(newExpanded);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "withProject") return task.projectId;
    if (filter === "standalone") return !task.projectId;
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginatedTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const groupedTasks = effectiveViewMode === "grouped"
    ? paginatedTasks.reduce((acc, task) => {
        const key = task.projectId ? `project-${task.projectId}` : 'standalone';
        if (!acc[key]) {
          acc[key] = {
            projectName: task.project?.name || 'Standalone Tasks',
            projectId: task.projectId,
            tasks: [],
          };
        }
        acc[key].tasks.push(task);
        return acc;
      }, {} as Record<string, { projectName: string; projectId?: number; tasks: Task[] }>)
    : null;

  const TaskCard = ({ task }: { task: Task }) => (
    <li className="list-none">
      <article
        className="card-panel row-hover group cursor-pointer p-4"
        onClick={() => navigate(`/tasks/${task.id}`)}
        role="button"
        tabIndex={0}
        aria-label={`View task: ${task.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/tasks/${task.id}`);
          }
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            {/* Title & Status */}
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h4 className="min-w-0 break-words text-base font-semibold text-[var(--color-text-primary)]">
                {task.title}
              </h4>
              <StatusBadge status={task.status} />
            </div>

            {/* Project Badge (if in project) */}
            {task.project && effectiveViewMode === "all" && (
              <div className="mb-2 flex min-w-0">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="min-w-0 truncate" aria-label={`Project: ${task.project.name}`}>{task.project.name}</span>
                </span>
              </div>
            )}

            {/* Meta Info */}
            <dl className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Client:</dt>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <dd>{task.client?.name || `Client #${task.clientId}`}</dd>
              </div>

              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Worker:</dt>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <dd>
                {task.workers?.length
                  ? task.workers
                      .map((tw) => `${tw.user.avatarEmoji ? tw.user.avatarEmoji + " " : ""}${tw.user.name}`)
                      .join(", ")
                  : "Unassigned"}
              </dd>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Due date:</dt>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <dd>
                    <time dateTime={task.dueDate}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </time>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions: Delete */}
          <div className="flex w-full gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            <Button
              variant="danger"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete task "${task.title}"?`)) {
                  onDelete(task.id);
                }
              }}
              aria-label={`Delete task: ${task.title}`}
            >
              Delete
            </Button>
          </div>
        </div>
      </article>
    </li>
  );

  return (
    <section className="min-w-0 max-w-full space-y-4" aria-labelledby="tasks-heading">
      {/* Header with Controls */}
      <header className="card-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h3 id="tasks-heading" className="shrink-0 text-lg font-bold text-[var(--color-text-primary)]">
            Tasks
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({filteredTasks.length})
            </span>
          </h3>

          {/* Filter pills */}
          <div className="-mx-1 overflow-x-auto px-1">
            <div
              className="inline-flex shrink-0 gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1"
              role="tablist"
              aria-label="Task filters"
            >
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  role="tab"
                  aria-selected={filter === key}
                  aria-controls="tasks-list"
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === key
                      ? "border border-[var(--color-tab-active-border)] bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "border border-transparent bg-transparent text-[var(--color-tab-inactive-text)] hover:border-[var(--color-border)] hover:bg-[var(--color-tab-inactive-hover-bg)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setViewMode(viewMode === "all" ? "grouped" : "all")}
          disabled={filter === "withProject"}
          className="w-full sm:w-auto sm:shrink-0"
          aria-label={effectiveViewMode === "all" ? "Group tasks by project" : "Show all tasks in a single list"}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {effectiveViewMode === "all" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          {effectiveViewMode === "all" ? "Group by Project" : "Show All"}
        </Button>
      </header>

      {/* Tasks Display */}
      <div id="tasks-list" role="tabpanel">
        {filteredTasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            description={filter !== "all" ? "Try changing the filter" : "Create your first task to get started"}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
        ) : effectiveViewMode === "grouped" && groupedTasks ? (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([key, group]) => {
              const isExpanded = expandedProjects.has(key) || expandedProjects.size === 0;
              return (
                <section
                  key={key}
                  className="card-panel overflow-hidden"
                  aria-labelledby={`project-${key}-heading`}
                >
                  <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <svg className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <h4 id={`project-${key}-heading`} className="min-w-0 truncate text-base font-bold text-[var(--color-text-primary)]">
                        {group.projectName}
                      </h4>
                      <span className="shrink-0 rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]">
                        {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleProject(key)}
                      className="shrink-0 rounded-lg p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-3)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                      aria-expanded={isExpanded}
                      aria-controls={`project-${key}-tasks`}
                      aria-label={isExpanded ? `Collapse ${group.projectName}` : `Expand ${group.projectName}`}
                    >
                      <svg
                        className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </header>
                  {isExpanded && (
                    <div className="bg-[var(--color-surface-2)] p-3">
                      <ul
                        id={`project-${key}-tasks`}
                        className="space-y-2"
                        aria-labelledby={`project-${key}-heading`}
                      >
                        {group.tasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <ul className="stagger-children space-y-3" aria-label="All tasks">
            {paginatedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </section>
  );
};

export default TasksList;
