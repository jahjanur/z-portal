import React from "react";
import Button from "../ui/Button";

interface AdminStatusControlsProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  onApproveCompletion: () => void;
}

const AdminStatusControls: React.FC<AdminStatusControlsProps> = ({
  currentStatus,
  onStatusChange,
  onApproveCompletion,
}) => {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => onStatusChange("PENDING")}>
        Mark as Pending
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onStatusChange("IN_PROGRESS")}>
        Mark as In Progress
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onStatusChange("COMPLETED")}>
        Mark as Completed
      </Button>
      {currentStatus === "PENDING_APPROVAL" && (
        <Button variant="primary" size="sm" onClick={onApproveCompletion}>
          ✓ Approve Completion
        </Button>
      )}
    </div>
  );
};

export default AdminStatusControls;
