import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAdmin } from "../../contexts/AdminContext";
import ClientForm from "../../components/admin/ClientForm";
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
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Clients</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl card-panel p-8">
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Clients</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Invite new clients or manage clients you referred. They will receive an email to set their password and complete their profile.
      </p>

      <div className="mt-6 rounded-2xl card-panel p-6 shadow-xl">
        <ClientForm onInviteSent={handleInviteSent} colors={colors} hideDomainAndHosting />

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
                    <p className="text-sm text-[var(--color-text-muted)]">{inv.company ?? "—"} · {inv.email}</p>
                    <p className={`text-xs ${inv.status === "EXPIRED" ? "text-red-400" : "text-amber-400"}`}>
                      {inv.status === "EXPIRED" ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResend(inv.id)}
                      disabled={resendingIds.has(inv.id)}
                      className="h-8 px-3 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                    >
                      {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                    </button>
                    {inv.status === "PENDING" && (
                      <button
                        type="button"
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
      </div>

      <h3 className="mt-8 mb-4 text-xl font-bold text-[var(--color-text-primary)]">My clients</h3>
      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark w-full max-w-md rounded-xl px-4 py-2.5 text-sm"
        />
      </div>

      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        {erasphereClients.length === 0 ? (
          <p className="py-12 text-center text-[var(--color-text-muted)]">
            {clients.some((c) => c.referredById != null) ? "No clients match your search." : "No EraSphere-referred clients yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {erasphereClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{c.company ?? "—"} • {c.email}</p>
                </div>
                <span
                  className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold sm:self-center ${
                    c.profileStatus === "COMPLETE" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {c.profileStatus === "COMPLETE" ? "Complete" : "Incomplete"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
