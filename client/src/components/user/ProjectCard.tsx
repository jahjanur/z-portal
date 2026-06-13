import React from "react";
import StatusBadge from "../ui/StatusBadge";

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  dueDate?: string | null;
  createdAt: string;
  worker?: { name: string } | null;
  files?: unknown[];
}

interface ProjectCardProps {
  task: Task;
  onClick: () => void;
  /** Legacy prop — statuses now render via StatusBadge; kept for API compatibility */
  getStatusColor: (status?: string | null) => string;
  formatDate: (date?: string | null) => string;
  getDaysUntilDue: (date?: string | null) => number | null;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  task,
  onClick,
  formatDate,
  getDaysUntilDue,
}) => {
  const daysUntil = getDaysUntilDue(task.dueDate);
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  return (
    <div
      onClick={onClick}
      className="card-panel card-panel-hover cursor-pointer p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{task.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)]">
            {task.worker && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium text-[var(--color-text-secondary)]">{task.worker.name}</span>
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1.5 ${
                  isOverdue
                    ? "font-semibold text-[var(--color-destructive-text)]"
                    : isDueSoon
                    ? "font-semibold text-[var(--color-warning-text)]"
                    : ""
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {isOverdue
                    ? `Overdue by ${Math.abs(daysUntil!)} days`
                    : isDueSoon
                    ? `Due in ${daysUntil} days`
                    : `Due: ${formatDate(task.dueDate)}`}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Created: {formatDate(task.createdAt)}</span>
            </span>
          </div>
        </div>
        <StatusBadge status={task.status} className="shrink-0 self-start" />
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">
          {(task.files || []).length} files attached
        </span>
        <button className="btn-secondary w-full rounded-full px-4 py-2 text-sm sm:w-auto">
          View Details →
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
