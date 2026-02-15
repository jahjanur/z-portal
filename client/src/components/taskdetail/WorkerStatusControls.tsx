import React from "react";

interface WorkerStatusControlsProps {
  currentStatus: string;
  onRequestCompletion: () => void;
}

const WorkerStatusControls: React.FC<WorkerStatusControlsProps> = ({
  currentStatus,
  onRequestCompletion,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {currentStatus !== "COMPLETED" && currentStatus !== "PENDING_APPROVAL" ? (
        <button
          onClick={onRequestCompletion}
          className="btn-primary px-4 py-2 text-sm font-semibold"
        >
          Request Completion
        </button>
      ) : currentStatus === "PENDING_APPROVAL" ? (
        <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
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