import React from "react";

interface WorkerStatusControlsProps {
  currentStatus: string;
  onRequestCompletion: () => void;
}

const WorkerStatusControls: React.FC<WorkerStatusControlsProps> = ({
  currentStatus,
  onRequestCompletion,
}) => {
  const colors = {
    primary: "#5B4FFF",
  };

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {currentStatus !== "COMPLETED" && currentStatus !== "PENDING_APPROVAL" ? (
        <button
          onClick={onRequestCompletion}
          className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          Request Completion
        </button>
      ) : currentStatus === "PENDING_APPROVAL" ? (
        <div className="px-4 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-lg bg-purple-50">
          ⏳ Waiting for admin approval
        </div>
      ) : (
        <div className="px-4 py-2 text-sm font-medium text-green-700 border border-green-200 rounded-lg bg-green-50">
          ✓ Task completed
        </div>
      )}
    </div>
  );
};

export default WorkerStatusControls;