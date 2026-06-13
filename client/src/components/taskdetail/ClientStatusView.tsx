import React from "react";
import StatusBadge from "../ui/StatusBadge";

interface ClientStatusViewProps {
  currentStatus: string;
}

const ClientStatusView: React.FC<ClientStatusViewProps> = ({ currentStatus }) => {
  const getProgress = () => {
    switch (currentStatus.toUpperCase()) {
      case "PENDING":
        return 20;
      case "IN_PROGRESS":
        return 60;
      case "PENDING_APPROVAL":
        return 90;
      case "COMPLETED":
        return 100;
      default:
        return 0;
    }
  };

  const getProgressColor = () => {
    const progress = getProgress();
    if (progress === 100) return "var(--color-success-text)";
    if (progress >= 60) return "var(--color-info-text)";
    if (progress >= 20) return "var(--color-warning-text)";
    return "var(--color-text-muted)";
  };

  const getStatusLabel = () => {
    switch (currentStatus.toUpperCase()) {
      case "PENDING":
        return "Waiting to start";
      case "IN_PROGRESS":
        return "Work in progress";
      case "PENDING_APPROVAL":
        return "Under review";
      case "COMPLETED":
        return "Project completed";
      default:
        return "Status unknown";
    }
  };

  const progress = getProgress();
  const color = getProgressColor();

  return (
    <div className="card-panel mt-6 p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="section-title text-sm">Project Progress</h3>
        <span className="text-2xl font-bold tracking-tight" style={{ color }}>
          {progress}%
        </span>
      </div>

      <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        ></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: color }}
          ></div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{getStatusLabel()}</p>
        </div>
        <StatusBadge status={currentStatus} />
      </div>
    </div>
  );
};

export default ClientStatusView;
