import React from "react";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";

interface WorkerStatusControlsProps {
  currentStatus: string;
  onRequestCompletion: () => void;
}

const WorkerStatusControls: React.FC<WorkerStatusControlsProps> = ({
  currentStatus,
  onRequestCompletion,
}) => {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {currentStatus !== "COMPLETED" && currentStatus !== "PENDING_APPROVAL" ? (
        <Button variant="primary" size="sm" onClick={onRequestCompletion}>
          Request Completion
        </Button>
      ) : currentStatus === "PENDING_APPROVAL" ? (
        <StatusBadge tone="warning">Waiting for admin approval</StatusBadge>
      ) : (
        <StatusBadge tone="success">Task completed</StatusBadge>
      )}
    </div>
  );
};

export default WorkerStatusControls;
