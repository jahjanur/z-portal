import { useNavigate } from "react-router-dom";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

interface ListDisplayProps<T extends { id: number }> {
  items: T[];
  onDelete: (id: number) => void;
  onResendInvite?: (id: number) => void;
  onSendReset?: (id: number) => void;
  renderItem: (item: T) => React.ReactNode;
  showProfileStatus?: boolean;
  getProfileStatus?: (item: T) => string | null | undefined;
}

const ListDisplay = <T extends { id: number }>({
  items,
  onDelete,
  onResendInvite,
  onSendReset,
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

  if (items.length === 0) {
    return <EmptyState compact title="Nothing here yet" description="Items will appear here once added." />;
  }

  return (
    <div className="stagger-children space-y-3">
      {items.map((item) => {
        const profileStatus = showProfileStatus && getProfileStatus ? getProfileStatus(item) : null;
        const isIncomplete = isProfileIncomplete(profileStatus);

        return (
          <div
            key={item.id}
            className="card-panel row-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => navigate(`/clients/${item.id}`)}
              className="min-w-0 flex-1 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-lg"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                {renderItem(item)}
                {showProfileStatus && profileStatus && (
                  <StatusBadge
                    status={profileStatus.trim().toUpperCase() === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}
                  >
                    {profileStatus.trim().toUpperCase() === "COMPLETE" ? "Complete" : "Incomplete Profile"}
                  </StatusBadge>
                )}
              </div>
            </button>

            <div className="relative z-10 flex w-full gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
              {showProfileStatus && isIncomplete && onResendInvite && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 whitespace-nowrap sm:flex-none"
                  onClick={() => onResendInvite(item.id)}
                >
                  Resend Invite
                </Button>
              )}
              {onSendReset && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 whitespace-nowrap sm:flex-none"
                  onClick={() => onSendReset(item.id)}
                >
                  Reset password
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                className="flex-1 whitespace-nowrap sm:flex-none"
                onClick={(e) => {
                  e.preventDefault();
                  if (window.confirm("Delete this client? This cannot be undone.")) {
                    onDelete(item.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListDisplay;
