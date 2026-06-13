import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import { SkeletonDashboard } from "../components/ui/Skeleton";

interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
  profileStatus?: string; // Keep as string for flexibility
  createdAt: string;
  phoneNumber?: string;
  postalAddress?: string;
  role?: string;
}

const PILL_ACTIVE =
  "rounded-full bg-[var(--color-nav-active-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-nav-active-text)] shadow-elev-sm transition-colors";
const PILL_INACTIVE =
  "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]";

export default function ClientsList() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingInviteId, setSendingInviteId] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await API.get("/users");
      const clientData = response.data.filter((u: Client) => u.role === "CLIENT");
      setClients(clientData);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const resendInvite = async (clientId: number) => {
    setSendingInviteId(clientId);
    try {
      await API.post(`/users/${clientId}/resend-invite`);
      toast.success("Invite sent successfully!");
    } catch (err) {
      console.error("Error resending invite:", err);
      toast.error("Failed to send invite.");
    } finally {
      setSendingInviteId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filteredClients = clients.filter((client) => {
    const normalizedStatus = client.profileStatus?.trim().toLowerCase() || "";
    const matchesFilter =
      filter === "all" ||
      (filter === "complete" && normalizedStatus.includes("complete")) ||
      (filter === "incomplete" && normalizedStatus.includes("incomplete"));

    const matchesSearch =
      !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const completeCount = clients.filter(c =>
    (c.profileStatus?.trim().toLowerCase() || "").includes("complete")
  ).length;
  const incompleteCount = clients.filter(c =>
    (c.profileStatus?.trim().toLowerCase() || "").includes("incomplete")
  ).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Active Clients"
          subtitle="Manage all your client accounts and profiles"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
          <StatCard
            label="Total Clients"
            value={clients.length}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            label="Complete Profiles"
            value={completeCount}
            tone="success"
            hint={`${clients.length > 0 ? Math.round((completeCount / clients.length) * 100) : 0}% completion rate`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Incomplete Profiles"
            value={incompleteCount}
            tone="warning"
            hint="Need to complete onboarding"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>

        {/* Filters and search */}
        <div className="card-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter("all")} className={filter === "all" ? PILL_ACTIVE : PILL_INACTIVE}>
              All ({clients.length})
            </button>
            <button onClick={() => setFilter("complete")} className={filter === "complete" ? PILL_ACTIVE : PILL_INACTIVE}>
              Complete ({completeCount})
            </button>
            <button onClick={() => setFilter("incomplete")} className={filter === "incomplete" ? PILL_ACTIVE : PILL_INACTIVE}>
              Incomplete ({incompleteCount})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full rounded-xl px-4 py-2 pl-10 text-sm md:w-64"
            />
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Clients grid */}
        {filteredClients.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No clients found"
            description="Try adjusting your filters or search query"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {filteredClients.map((client) => {
              const normalizedStatus = client.profileStatus?.trim().toLowerCase() || "";

              return (
                <div
                  key={client.id}
                  className="card-panel card-panel-hover cursor-pointer p-5 sm:p-6"
                  onClick={() => navigate(isAdmin ? "/admin/zulbera/clients" : "/admin/clients")}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] text-lg font-bold text-[var(--color-text-primary)]">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[var(--color-text-primary)]">{client.name}</h3>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{client.company || "No company"}</p>
                      </div>
                    </div>
                    <StatusBadge status={client.profileStatus} className="shrink-0">
                      {client.profileStatus || "Unknown"}
                    </StatusBadge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{client.email}</span>
                    </div>

                    {client.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{client.phoneNumber}</span>
                      </div>
                    )}

                    {client.postalAddress && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{client.postalAddress}</span>
                      </div>
                    )}

                    {/* Resend Invite Button for INCOMPLETE clients */}
                    {normalizedStatus.includes("incomplete") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          resendInvite(client.id);
                        }}
                        loading={sendingInviteId === client.id}
                        disabled={sendingInviteId === client.id}
                      >
                        {sendingInviteId === client.id ? "Sending..." : "Resend Invite"}
                      </Button>
                    )}

                    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                      <p className="text-xs text-[var(--color-text-muted)]">Joined {formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
