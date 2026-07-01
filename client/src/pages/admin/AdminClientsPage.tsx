import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import ClientSearch from "../../components/admin/ClientSearch";
import ClientForm from "../../components/admin/ClientForm";
import ListDisplay from "../../components/admin/ListDisplay";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import API from "../../api";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

interface InviteItem {
  id: number;
  email: string;
  name: string;
  company: string | null;
  expiresAt: string;
  status: string;
}

export default function AdminClientsPage() {
  const {
    clients,
    completeClients,
    deleteUser,
    fetchAll,
    sendPasswordReset,
  } = useAdmin();
  const [showCompletedProfiles, setShowCompletedProfiles] = useState(false);

  const handleSendReset = async (id: number) => {
    try {
      await sendPasswordReset(id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't send password reset");
    }
  };
  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";
  const formRef = useRef<HTMLDivElement>(null);

  // Admin sees all clients (including EraSphere-referred). EraSphere sees only their referred clients (API already filters).
  const displayClients = clients;
  const displayComplete = completeClients;

  const [pendingInvites, setPendingInvites] = useState<InviteItem[]>([]);
  const [resendingIds, setResendingIds] = useState<Set<number>>(new Set());

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await API.get<InviteItem[]>("/invites/for-role/CLIENT");
      setPendingInvites(data.filter((i) => i.status === "PENDING" || i.status === "EXPIRED"));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleInviteSent = () => {
    loadInvites();
    fetchAll();
  };

  const handleResend = async (id: number) => {
    setResendingIds((prev) => new Set(prev).add(id));
    try {
      await API.post(`/invites/${id}/resend`);
      toast.success("Invite resent");
      loadInvites();
    } catch {
      toast.error("Failed to resend invite");
    } finally {
      setResendingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await API.post(`/invites/${id}/cancel`);
      toast.success("Invite cancelled");
      loadInvites();
    } catch {
      toast.error("Failed to cancel invite");
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Invite new clients and manage existing accounts"
        actions={
          <Button
            variant="primary"
            onClick={() =>
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Button>
        }
      />

      <div ref={formRef} className="scroll-mt-24">
        <ClientForm onInviteSent={handleInviteSent} colors={colors} hideDomainAndHosting={isEraSphere} />
      </div>

      {/* Pending client invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h3 className="section-title">
            Pending Invites <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">({pendingInvites.length})</span>
          </h3>
          <div className="stagger-children space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="card-panel row-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">{inv.company} &middot; {inv.email}</p>
                  <div className="mt-1.5">
                    {inv.status === "EXPIRED" ? (
                      <StatusBadge status="EXPIRED" />
                    ) : (
                      <StatusBadge tone="warning">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    loading={resendingIds.has(inv.id)}
                    onClick={() => handleResend(inv.id)}
                  >
                    {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                  </Button>
                  {inv.status === "PENDING" && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleCancel(inv.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="section-title">Search Clients</h3>
        <ClientSearch clients={displayClients} onDelete={deleteUser} colors={colors} />
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowCompletedProfiles(!showCompletedProfiles)}
          className="card-panel row-hover mb-4 flex w-full items-center justify-between p-4 text-left"
          aria-expanded={showCompletedProfiles}
        >
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Active Clients <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({displayComplete.length})</span>
          </h3>
          <svg className={`h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${showCompletedProfiles ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCompletedProfiles && (
          <div>
            {displayComplete.length > 0 ? (
              <ListDisplay
                items={displayComplete}
                onDelete={deleteUser}
                onSendReset={handleSendReset}
                showProfileStatus
                getProfileStatus={(c) => c.profileStatus}
                renderItem={(c) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                    <p className="truncate text-sm text-[var(--color-text-muted)]">{c.company} &middot; {c.email}</p>
                    {c.postalAddress && <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{c.postalAddress}</p>}
                  </div>
                )}
              />
            ) : (
              <EmptyState
                compact
                title="No active clients yet"
                description="Clients appear here once they complete their profile."
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
