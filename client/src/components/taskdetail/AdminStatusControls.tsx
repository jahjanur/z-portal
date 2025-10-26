import React from "react";

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
  const colors = {
    primary: "#5B4FFF",
  };

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      <button
        onClick={() => onStatusChange("PENDING")}
        className="px-4 py-2 text-sm font-semibold transition-colors border rounded-lg bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
      >
        Mark as Pending
      </button>
      <button
        onClick={() => onStatusChange("IN_PROGRESS")}
        className="px-4 py-2 text-sm font-semibold text-blue-700 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
      >
        Mark as In Progress
      </button>
      <button
        onClick={() => onStatusChange("COMPLETED")}
        className="px-4 py-2 text-sm font-semibold text-green-700 transition-colors border border-green-200 rounded-lg bg-green-50 hover:bg-green-100"
      >
        Mark as Completed
      </button>
      {currentStatus === "PENDING_APPROVAL" && (
        <button
          onClick={onApproveCompletion}
          className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Approve Completion
        </button>
      )}
    </div>
  );
};

export default AdminStatusControls;