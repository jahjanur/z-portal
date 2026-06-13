import React from "react";
import StatusBadge from "../ui/StatusBadge";

interface Task {
  id: number;
  title: string;
  status?: string | null;
  workers?: { user: { name: string } }[];
}

interface RecentProjectCardProps {
  task: Task;
  onClick: () => void;
  /** Legacy prop — statuses now render via StatusBadge; kept for API compatibility */
  getStatusColor: (status?: string | null) => string;
}

const RecentProjectCard: React.FC<RecentProjectCardProps> = ({ task, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="card-panel card-panel-hover cursor-pointer p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {task.title}
          </h4>
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
            {task.workers?.length
              ? task.workers.map((tw) => tw.user.name).join(", ")
              : "Unassigned"}
          </p>
        </div>
        <StatusBadge status={task.status} className="shrink-0" />
      </div>
    </div>
  );
};

export default RecentProjectCard;
