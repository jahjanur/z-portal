import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface User {
  name: string;
  company?: string;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
  clientId: number;
  workerId?: number;
  dueDate?: string;
  status: string;
  projectId?: number;
  client?: User;
  worker?: User;
  project?: Project;
}

interface TasksListProps {
  tasks: Task[];
  onDelete: (id: number) => void;
  colors: { primary: string };
}

const TasksList: React.FC<TasksListProps> = ({ tasks, onDelete, colors }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"all" | "grouped">("all");
  const [filter, setFilter] = useState<"all" | "withProject" | "standalone">("all");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const effectiveViewMode = filter === "withProject" ? "grouped" : viewMode;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "✓ Completed";
      case "IN_PROGRESS":
        return "⚡ In Progress";
      case "PENDING":
        return "○ Pending";
      default:
        return status;
    }
  };

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

  const groupedTasks = effectiveViewMode === "grouped"
    ? filteredTasks.reduce((acc, task) => {
        const key = task.projectId ? `project-${task.projectId}` : 'standalone';
        if (!acc[key]) {
          acc[key] = {
            projectName: task.project?.name || '📋 Standalone Tasks',
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
        className="p-4 transition-all bg-white border border-gray-200 cursor-pointer rounded-xl hover:shadow-md hover:border-[#5B4FFF] group"
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title & Status */}
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-base font-semibold text-gray-900 truncate transition-colors group-hover:text-[#5B4FFF]">
                {task.title}
              </h4>
              <span 
                className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)} whitespace-nowrap`}
                role="status"
                aria-label={`Status: ${getStatusLabel(task.status)}`}
              >
                {getStatusLabel(task.status)}
              </span>
            </div>

            {/* Project Badge (if in project) */}
            {task.project && effectiveViewMode === "all" && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[#7C73FF] rounded-full border border-[#5B4FFF]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span aria-label={`Project: ${task.project.name}`}>{task.project.name}</span>
                </span>
              </div>
            )}

            {/* Meta Info */}
            <dl className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Client:</dt>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <dd>{task.client?.name || `Client #${task.clientId}`}</dd>
              </div>

              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Worker:</dt>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <dd>{task.worker?.name || "Unassigned"}</dd>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Due date:</dt>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete task "${task.title}"?`)) {
                onDelete(task.id);
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Delete task: ${task.title}`}
          >
            Delete
          </button>
        </div>
      </article>
    </li>
  );

  return (
    <section className="space-y-4" aria-labelledby="tasks-heading">
      {/* Header with Controls */}
      <header className="flex flex-col gap-4 p-4 border border-gray-200 bg-gray-50 sm:flex-row sm:items-center sm:justify-between rounded-xl">
        <div className="flex items-center gap-4">
          <h3 id="tasks-heading" className="text-lg font-bold text-gray-900">
            Tasks
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredTasks.length})
            </span>
          </h3>

          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-lg" role="tablist" aria-label="Task filters">
            <button
              onClick={() => setFilter("all")}
              role="tab"
              aria-selected={filter === "all"}
              aria-controls="tasks-list"
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                filter === "all" 
                  ? "bg-[#5B4FFF] text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("withProject")}
              role="tab"
              aria-selected={filter === "withProject"}
              aria-controls="tasks-list"
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                filter === "withProject" 
                  ? "bg-[#5B4FFF] text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              In Projects
            </button>
            <button
              onClick={() => setFilter("standalone")}
              role="tab"
              aria-selected={filter === "standalone"}
              aria-controls="tasks-list"
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                filter === "standalone" 
                  ? "bg-[#5B4FFF] text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Standalone
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <button
          onClick={() => setViewMode(viewMode === "all" ? "grouped" : "all")}
          disabled={filter === "withProject"}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B4FFF] ${
            filter === "withProject" ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{ backgroundColor: colors.primary }}
          aria-label={effectiveViewMode === "all" ? "Group tasks by project" : "Show all tasks in a single list"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {effectiveViewMode === "all" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          {effectiveViewMode === "all" ? "Group by Project" : "Show All"}
        </button>
      </header>

      {/* Tasks Display */}
      <div id="tasks-list" role="tabpanel">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center bg-white border border-gray-200 rounded-2xl">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium text-gray-700">No tasks found</p>
            <p className="mt-1 text-sm text-gray-500">
              {filter !== "all" ? "Try changing the filter" : "Create your first task to get started"}
            </p>
          </div>
        ) : effectiveViewMode === "grouped" && groupedTasks ? (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([key, group]) => {
              const isExpanded = expandedProjects.has(key) || expandedProjects.size === 0;
              return (
                <section 
                  key={key} 
                  className="overflow-hidden border border-gray-200 rounded-2xl"
                  aria-labelledby={`project-${key}-heading`}
                >
                  <header 
                    className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#7C73FF] bg-gradient-to-r from-[#F8F9FA] to-[#7C73FF]/20"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#5B4FFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <h4 id={`project-${key}-heading`} className="text-base font-bold text-[#1A1A2E]">
                        {group.projectName}
                      </h4>
                      <span className="px-2.5 py-0.5 text-xs font-semibold text-white bg-[#5B4FFF] rounded-full border border-[#5B4FFF]">
                        {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleProject(key)}
                      className="p-1 text-[#5B4FFF] transition-colors rounded hover:bg-[#7C73FF]/20 focus:outline-none focus:ring-2 focus:ring-[#5B4FFF]"
                      aria-expanded={isExpanded}
                      aria-controls={`project-${key}-tasks`}
                      aria-label={isExpanded ? `Collapse ${group.projectName}` : `Expand ${group.projectName}`}
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
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
                    <div className="p-3 bg-white">
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
          <ul className="space-y-2" aria-label="All tasks">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default TasksList;