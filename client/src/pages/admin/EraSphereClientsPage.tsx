import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAdmin } from "../../contexts/AdminContext";
import ClientForm from "../../components/admin/ClientForm";
import API from "../../api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { CONTROL_INPUT } from "../../components/ui/controls";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

interface InviteItem {
  id: number;
  email: string;
  name: string;
  company: string | null;
  expiresAt: string;
  status: string;
}

export default function EraSphereClientsPage() {
  const { clients, loading, fetchAll } = useAdmin();
  const [search, setSearch] = useState("");
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
      setResendingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
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

  const erasphereClients = useMemo(() => {
    const list = clients.filter((c) => c.role === "CLIENT" && c.referredById != null);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
        <PageHeader title="EraSphere Clients" subtitle="Invite new clients or manage clients you referred" />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="EraSphere Clients"
        subtitle="Invite new clients or manage clients you referred. They will receive an email to set their password and complete their profile."
      />

      <section className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
        <ClientForm onInviteSent={handleInviteSent} colors={colors} hideDomainAndHosting />
      </section>

      {pendingInvites.length > 0 && (
        <section className="animate-fade-up">
          <h3 className="section-title mb-4">
            Pending Invites{" "}
            <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
              ({pendingInvites.length})
            </span>
          </h3>
          <div className="space-y-3 stagger-children">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="card-panel row-hover flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                    <StatusBadge status={inv.status === "EXPIRED" ? "EXPIRED" : "PENDING"} />
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{inv.company ?? "—"} · {inv.email}</p>
                  {inv.status !== "EXPIRED" && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={resendingIds.has(inv.id)}
                    onClick={() => handleResend(inv.id)}
                    className="flex-1 sm:flex-none"
                  >
                    {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                  </Button>
                  {inv.status === "PENDING" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancel(inv.id)}
                      className="flex-1 sm:flex-none"
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

      <section className="animate-fade-up">
        <h3 className="section-title mb-4">My Clients</h3>
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${CONTROL_INPUT} w-full sm:max-w-sm`}
          />
        </div>

        {erasphereClients.length === 0 ? (
          <EmptyState
            compact
            title={clients.some((c) => c.referredById != null) ? "No clients match your search" : "No EraSphere-referred clients yet"}
            description={
              clients.some((c) => c.referredById != null)
                ? "Try a different name, email or company."
                : "Invite a client above to get started."
            }
          />
        ) : (
          <div className="space-y-3 stagger-children">
            {erasphereClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className="card-panel row-hover flex flex-col gap-2 rounded-xl p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{c.company ?? "—"} · {c.email}</p>
                </div>
                <StatusBadge
                  status={c.profileStatus === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}
                  className="shrink-0 self-start sm:self-center"
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
