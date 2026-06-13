import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import ClientSearch from "../../components/admin/ClientSearch";
import ClientForm from "../../components/admin/ClientForm";
import ListDisplay from "../../components/admin/ListDisplay";
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
  } = useAdmin();
  const [showCompletedProfiles, setShowCompletedProfiles] = useState(false);
  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";

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
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="mt-6 rounded-2xl card-panel p-6 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Clients Management</h2>
        <ClientForm onInviteSent={handleInviteSent} colors={colors} hideDomainAndHosting={isEraSphere} />

        {/* Pending client invites */}
        {pendingInvites.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
              Pending Invites <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({pendingInvites.length})</span>
            </h3>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex flex-col gap-2 rounded-lg card-panel p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{inv.company} &middot; {inv.email}</p>
                    <p className={`text-xs ${inv.status === "EXPIRED" ? "text-red-400" : "text-amber-400"}`}>
                      {inv.status === "EXPIRED" ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={resendingIds.has(inv.id)}
                      className="h-8 px-3 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                    >
                      {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                    </button>
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        className="h-8 px-3 text-xs font-medium rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">Search clients</h3>
          <ClientSearch clients={displayClients} onDelete={deleteUser} colors={colors} />
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowCompletedProfiles(!showCompletedProfiles)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-colors hover:bg-[var(--color-surface-3)]"
          >
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Active Clients <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({displayComplete.length})</span>
            </h3>
            <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showCompletedProfiles ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCompletedProfiles && (
            <div>
              {displayComplete.length > 0 ? (
                <ListDisplay
                  items={displayComplete}
                  onDelete={deleteUser}
                  showProfileStatus
                  getProfileStatus={(c) => c.profileStatus}
                  renderItem={(c) => (
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{c.company} &middot; {c.email}</p>
                      {c.postalAddress && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{c.postalAddress}</p>}
                    </div>
                  )}
                />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No active clients yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
