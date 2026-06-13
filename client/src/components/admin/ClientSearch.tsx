import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../api";
import StatusBadge from "../ui/StatusBadge";
import Button from "../ui/Button";

interface User {
  id: number;
  name: string;
  company?: string;
  email: string;
  profileStatus?: string;
}

interface ClientSearchProps {
  clients: User[];
  onDelete: (id: number) => void;
  colors?: { primary: string };
}

const ClientSearch: React.FC<ClientSearchProps> = ({ clients, onDelete }) => {
  const [search, setSearch] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = clients.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleResendInvite = async (clientId: number, email: string) => {
    setResendingId(clientId);
    try {
      await API.post(`/users/${clientId}/resend-invite`);
      toast.success(`Invite email sent successfully to ${email}`);
    } catch (error) {
      console.error("Error resending invite:", error);
      toast.error("Failed to resend invite. Please try again.");
    } finally {
      setResendingId(null);
    }
  };

  const isProfileIncomplete = (client: User): boolean => {
    const status = client.profileStatus?.trim().toUpperCase() || "";
    return (
      status === "INCOMPLETE" ||
      status === "PENDING" ||
      status === "" ||
      !client.profileStatus
    );
  };

  return (
    <div className="mb-6">
      <div className="relative w-full sm:max-w-sm">
        <input
          type="search"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark h-11 w-full rounded-full px-4 py-2.5 pl-11 text-sm"
        />
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {search && (
          <div className="absolute top-full z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-elev-lg backdrop-blur-sm">
            {filtered.length > 0 ? (
              <div className="p-2">
                {filtered.map((c) => {
                  const isIncomplete = isProfileIncomplete(c);

                  return (
                    <div
                      key={c.id}
                      className="row-hover flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          navigate(`/clients/${c.id}`);
                          setSearch("");
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                          {isIncomplete && (
                            <StatusBadge status="INCOMPLETE" className="shrink-0">
                              Incomplete
                            </StatusBadge>
                          )}
                        </div>
                        <p className="truncate text-sm text-[var(--color-text-muted)]">
                          {c.company} &middot; {c.email}
                        </p>
                      </div>
                      <div className="pointer-events-auto flex w-full shrink-0 gap-2 sm:ml-3 sm:w-auto">
                        {/* Only show Resend Invite for INCOMPLETE clients - SAME LOGIC AS CLIENTSLIST */}
                        {isIncomplete && (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={resendingId === c.id}
                            className="flex-1 whitespace-nowrap sm:flex-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendInvite(c.id, c.email);
                            }}
                            title="Resend invite email"
                          >
                            {resendingId === c.id ? "Sending..." : "Resend"}
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1 whitespace-nowrap sm:flex-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`Delete ${c.name}? This cannot be undone.`)) {
                              onDelete(c.id);
                              setSearch("");
                            }
                          }}
                          title="Delete client"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">No clients found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSearch;
