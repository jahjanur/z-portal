import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import API from "../../api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { CONTROL_INPUT } from "../../components/ui/controls";

interface EraSpherePartner {
  id: number;
  email: string;
  name: string;
  company: string | null;
  createdAt: string;
  profileStatus: string | null;
  clientsCount: number;
  tasksCount: number;
}

interface InviteItem {
  id: number;
  email: string;
  name: string;
  company: string | null;
  expiresAt: string;
  status: string;
}

export default function AdminEraSpherePartnersPage() {
  const [partners, setPartners] = useState<EraSpherePartner[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingIds, setResendingIds] = useState<Set<number>>(new Set());

  const [inviteForm, setInviteForm] = useState({ name: "", email: "", company: "" });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const loadPartners = useCallback(async () => {
    try {
      const res = await API.get("/users/erasphere");
      setPartners(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load EraSphere partners");
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await API.get<InviteItem[]>("/invites/for-role/ERASPHERE");
      setInvites(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([loadPartners(), loadInvites()]).finally(() => setLoading(false));
  }, [loadPartners, loadInvites]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setInviteSubmitting(true);
    try {
      await API.post("/invites", {
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: "ERASPHERE",
        company: inviteForm.company.trim() || undefined,
      });
      toast.success("Invite sent to partner!");
      setInviteForm({ name: "", email: "", company: "" });
      loadInvites();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to send invite");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResendInvite = async (inviteId: number) => {
    setResendingIds((prev) => new Set(prev).add(inviteId));
    try {
      await API.post(`/invites/${inviteId}/resend`);
      toast.success("Invite resent");
      loadInvites();
    } catch {
      toast.error("Failed to resend invite");
    } finally {
      setResendingIds((prev) => { const n = new Set(prev); n.delete(inviteId); return n; });
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await API.post(`/invites/${inviteId}/cancel`);
      toast.success("Invite cancelled");
      loadInvites();
    } catch {
      toast.error("Failed to cancel invite");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full min-w-0 space-y-6">
        <PageHeader title="EraSphere Partners" subtitle="Invite and manage referral partners" />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] w-full min-w-0 space-y-6">
        <PageHeader title="EraSphere Partners" subtitle="Invite and manage referral partners" />
        <EmptyState compact title="Failed to load partners" description={error} />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "PENDING" || i.status === "EXPIRED");
  const totalClients = partners.reduce((s, p) => s + p.clientsCount, 0);
  const totalTasks = partners.reduce((s, p) => s + p.tasksCount, 0);

  return (
    <div className="mx-auto max-w-[1200px] w-full min-w-0 space-y-6">
      <PageHeader
        title="EraSphere Partners"
        subtitle="Invite and manage referral partners"
      />

      {/* Invite form */}
      <section className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
        <h3 className="section-title">Invite EraSphere Partner</h3>
        <p className="mt-1 mb-4 text-sm text-[var(--color-text-muted)]">
          The partner will receive an invite email to set their password and join.
        </p>
        <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Full name *"
            value={inviteForm.name}
            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
          <input
            type="email"
            placeholder="Email *"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={inviteForm.company}
            onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
            className={CONTROL_INPUT}
          />
          <Button type="submit" variant="primary" loading={inviteSubmitting} className="w-full">
            {inviteSubmitting ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
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
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                    <StatusBadge status={inv.status === "EXPIRED" ? "EXPIRED" : "PENDING"} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{inv.email}</p>
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
                    onClick={() => handleResendInvite(inv.id)}
                    className="flex-1 sm:flex-none"
                  >
                    {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                  </Button>
                  {inv.status === "PENDING" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelInvite(inv.id)}
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
        <div className="card-panel rounded-2xl p-5">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Partners</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{partners.length}</p>
        </div>
        <div className="card-panel rounded-2xl p-5">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Total clients (referred)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{totalClients}</p>
        </div>
        <div className="card-panel rounded-2xl p-5">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Total tasks (EraSphere)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{totalTasks}</p>
        </div>
      </div>

      {/* Active partners table */}
      <section className="min-w-0 max-w-full animate-fade-up">
        <h3 className="section-title mb-4">Active Partners</h3>
        {partners.length === 0 ? (
          <EmptyState
            compact
            title="No active EraSphere partners yet"
            description="Invite a partner above to get started."
          />
        ) : (
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Clients</th>
                  <th>Tasks</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-[var(--color-text-primary)]">{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.company ?? "—"}</td>
                    <td className="tabular-nums">{p.clientsCount}</td>
                    <td className="tabular-nums">{p.tasksCount}</td>
                    <td className="whitespace-nowrap text-[var(--color-text-muted)]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
