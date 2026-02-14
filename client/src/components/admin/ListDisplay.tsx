import { useNavigate } from "react-router-dom";

interface ListDisplayProps<T extends { id: number }> {
  items: T[];
  onDelete: (id: number) => void;
  onResendInvite?: (id: number) => void;
  renderItem: (item: T) => React.ReactNode;
  showProfileStatus?: boolean;
  getProfileStatus?: (item: T) => string | null | undefined;
}

const ListDisplay = <T extends { id: number }>({
  items,
  onDelete,
  onResendInvite,
  renderItem,
  showProfileStatus = false,
  getProfileStatus,
}: ListDisplayProps<T>) => {
  const navigate = useNavigate();

  // Helper function to check if profile is incomplete
  const isProfileIncomplete = (status: string | null | undefined): boolean => {
    const normalized = status?.trim().toUpperCase() || "";
    return (
      normalized === "INCOMPLETE" ||
      normalized === "PENDING" ||
      normalized === "" ||
      !status
    );
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const profileStatus = showProfileStatus && getProfileStatus ? getProfileStatus(item) : null;
        const isIncomplete = isProfileIncomplete(profileStatus);

        return (
          <div
            key={item.id}
            onClick={() => navigate(`/clients/${item.id}`)}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/15 hover:bg-white/[0.07]"
          >
            <div className="flex items-center flex-1 gap-3">
              {renderItem(item)}
              {showProfileStatus && profileStatus && (
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    profileStatus.trim().toUpperCase() === "COMPLETE"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {profileStatus.trim().toUpperCase() === "COMPLETE" ? "✓ Complete" : "⚠ Incomplete Profile"}
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {showProfileStatus && isIncomplete && onResendInvite && (
                <button
                  onClick={() => onResendInvite(item.id)}
                  className="px-3 py-1.5 text-sm font-semibold text-blue-300 bg-blue-500/20 rounded-full border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                  Resend Invite
                </button>
              )}
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-1.5 text-sm font-semibold text-red-300 bg-red-500/20 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListDisplay;