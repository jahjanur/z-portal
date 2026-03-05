import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../../api";
import { useAdmin } from "../../contexts/AdminContext";

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

export default function AdminEraSpherePartnersPage() {
  const { createWorker, fetchAll } = useAdmin();
  const [partners, setPartners] = useState<EraSpherePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingIds, setResendingIds] = useState<Set<number>>(new Set());

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await API.get("/users/erasphere");
        if (!cancelled) setPartners(res.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load EraSphere partners");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (inviteForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setInviteSubmitting(true);
    try {
      await createWorker({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        password: inviteForm.password,
        role: "ERASPHERE",
        company: inviteForm.company.trim() || undefined,
      });
      setInviteForm({ name: "", email: "", password: "", company: "" });
      const res = await API.get("/users/erasphere");
      setPartners(res.data);
      await fetchAll();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : "Failed to invite partner";
      toast.error(msg ?? "Failed to invite partner");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResendInvite = async (partner: EraSpherePartner) => {
    setResendingIds((prev) => new Set(prev).add(partner.id));
    try {
      await API.post(`/users/${partner.id}/resend-invite`);
      toast.success(`Invite email resent to ${partner.email}`);
    } catch {
      toast.error("Failed to resend invite email");
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev);
        next.delete(partner.id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl card-panel p-8">
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>
        <div className="rounded-2xl card-panel p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  const totalClients = partners.reduce((s, p) => s + p.clientsCount, 0);
  const totalTasks = partners.reduce((s, p) => s + p.tasksCount, 0);

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Partners</h2>

      {/* Invite EraSphere Partner */}
      <div className="mb-6 rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Invite EraSphere Partner</h3>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Send an invitation email so they can join as an EraSphere partner. They will get a link to complete their profile.
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
            type="password"
            placeholder="Password (min 6) *"
            value={inviteForm.password}
            onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
            className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm"
            required
            minLength={6}
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={inviteForm.company}
            onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
            className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm"
          />
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
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

      {/* Stats cards */}
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

      {/* Partners table */}
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6 min-w-0 max-w-full">
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          B2B partners who can manage clients and tasks. They have their own analytics dashboard. They do not have access to workers, invoices, domains, timesheets, or send offer.
        </p>
        {partners.length === 0 ? (
          <p className="py-8 text-center text-[var(--color-text-muted)]">No EraSphere partners yet. Use the form above to invite one.</p>
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
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Profile</th>
                  <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Joined</th>
                  <th className="pb-3 font-semibold text-[var(--color-text-primary)]">Actions</th>
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
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.profileStatus === "COMPLETE"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {p.profileStatus === "COMPLETE" ? "Complete" : "Incomplete"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {p.profileStatus !== "COMPLETE" && (
                        <button
                          onClick={() => handleResendInvite(p)}
                          disabled={resendingIds.has(p.id)}
                          className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        >
                          {resendingIds.has(p.id) ? "Sending..." : "Resend Invite"}
                        </button>
                      )}
                    </td>
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
