import React from "react";

interface Task {
  id: number;
  title: string;
  status?: string | null;
  worker?: { name: string } | null;
}

interface RecentProjectCardProps {
  task: Task;
  onClick: () => void;
  getStatusColor: (status?: string | null) => string;
}

const RecentProjectCard: React.FC<RecentProjectCardProps> = ({
  task,
  onClick,
  getStatusColor,
}) => {
  return (
    <div
      onClick={onClick}
      className="p-4 transition-all border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:border-gray-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{task.title}</h4>
          <p className="text-sm text-gray-500">
            {task.worker?.name || "Unassigned"}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
            task.status
          )}`}
        >
          {task.status?.replace("_", " ") || "N/A"}
        </span>
      </div>
    </div>
  );
};

export default RecentProjectCard;