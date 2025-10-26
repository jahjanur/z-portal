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

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const profileStatus = showProfileStatus && getProfileStatus ? getProfileStatus(item) : null;

        return (
          <div
            key={item.id}
            onClick={() => navigate(`/clients/${item.id}`)}
            className="flex items-center justify-between p-4 transition-colors bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center flex-1 gap-3">
              {renderItem(item)}
              {showProfileStatus && profileStatus && (
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    profileStatus === "COMPLETE"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {profileStatus === "COMPLETE" ? "✓ Complete" : "⚠ Incomplete Profile"}
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {showProfileStatus && profileStatus === "INCOMPLETE" && onResendInvite && (
                <button
                  onClick={() => onResendInvite(item.id)}
                  className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  Resend Invite
                </button>
              )}
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
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