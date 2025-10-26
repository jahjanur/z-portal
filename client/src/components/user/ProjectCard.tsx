import React from "react";

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
  getStatusColor: (status?: string | null) => string;
  formatDate: (date?: string | null) => string;
  getDaysUntilDue: (date?: string | null) => number | null;
  primaryColor: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  task,
  onClick,
  getStatusColor,
  formatDate,
  getDaysUntilDue,
  primaryColor,
}) => {
  const daysUntil = getDaysUntilDue(task.dueDate);
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  return (
    <div
      onClick={onClick}
      className="p-6 transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-md hover:border-gray-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-bold text-gray-900">{task.title}</h3>
          {task.description && (
            <p className="mb-3 text-sm text-gray-600">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {task.worker && (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{task.worker.name}</span>
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-2 ${
                  isOverdue
                    ? "text-red-600 font-semibold"
                    : isDueSoon
                    ? "text-amber-600 font-semibold"
                    : ""
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Created: {formatDate(task.createdAt)}</span>
            </span>
          </div>
        </div>
        <span
          className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(
            task.status
          )}`}
        >
          {task.status?.replace("_", " ") || "N/A"}
        </span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-600">
          {(task.files || []).length} files attached
        </span>
        <button
          className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;