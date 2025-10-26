import React from "react";

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
    if (progress === 100) return "#10B981";
    if (progress >= 60) return "#3B82F6";
    if (progress >= 20) return "#F59E0B";
    return "#6B7280";
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
    <div className="p-6 mt-6 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Project Progress</h3>
        <span className="text-2xl font-bold" style={{ color }}>
          {progress}%
        </span>
      </div>
      
      <div className="w-full h-4 mb-3 overflow-hidden bg-gray-200 rounded-full">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        ></div>
      </div>

      <div className="flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full animate-pulse" 
          style={{ backgroundColor: color }}
        ></div>
        <p className="text-sm font-medium text-gray-700">{getStatusLabel()}</p>
      </div>
    </div>
  );
};

export default ClientStatusView;