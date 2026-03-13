import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import API from "../../api";

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
      <div className="mx-auto max-w-[1200px] w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl card-panel p-8">
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>
        <div className="rounded-2xl card-panel p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "PENDING" || i.status === "EXPIRED");
  const totalClients = partners.reduce((s, p) => s + p.clientsCount, 0);
  const totalTasks = partners.reduce((s, p) => s + p.tasksCount, 0);

  return (
    <div className="mx-auto max-w-[1200px] w-full min-w-0">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>

      {/* Invite form */}
      <div className="mb-6 rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Invite EraSphere Partner</h3>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          The partner will receive an invite email to set their password and join.
        </p>
        <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Full name *"
            value={inviteForm.name}
            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email *"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={inviteForm.company}
            onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
            className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm"
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={inviteSubmitting}
              className="btn-primary h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {inviteSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 rounded-2xl card-panel p-4 shadow-xl sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] text-sm">{inv.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{inv.email}</p>
                  <p className={`text-xs ${inv.status === "EXPIRED" ? "text-red-400" : "text-amber-400"}`}>
                    {inv.status === "EXPIRED" ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleResendInvite(inv.id)}
                    disabled={resendingIds.has(inv.id)}
                    className="h-8 px-3 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                  >
                    {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                  </button>
                  {inv.status === "PENDING" && (
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
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

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Partners</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{partners.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Total clients (referred)</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalClients}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Total tasks (EraSphere)</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalTasks}</p>
        </div>
      </div>

      {/* Active partners table */}
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6 min-w-0 max-w-full">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Active Partners</h3>
        {partners.length === 0 ? (
          <p className="py-8 text-center text-[var(--color-text-muted)]">No active EraSphere partners yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Name</th>
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Email</th>
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Company</th>
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Clients</th>
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Tasks</th>
                  <th className="pb-3 font-semibold text-[var(--color-text-primary)]">Joined</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 pr-4 text-[var(--color-text-primary)]">{p.name}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{p.email}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{p.company ?? "—"}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{p.clientsCount}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">{p.tasksCount}</td>
                    <td className="py-3 text-[var(--color-text-muted)]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
