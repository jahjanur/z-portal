import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import WorkerForm from "../../components/admin/WorkerForm";
import WorkersList from "../../components/admin/WorkersList";
import API from "../../api";

interface InviteItem {
  id: number;
  email: string;
  name: string;
  role: string;
  expiresAt: string;
  used: boolean;
  cancelled: boolean;
  createdAt: string;
  status: string;
}

export default function AdminWorkersPage() {
  const { workers, deleteUser, fetchAll } = useAdmin();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [resendingIds, setResendingIds] = useState<Set<number>>(new Set());

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await API.get<InviteItem[]>("/invites/for-role/WORKER");
      setInvites(data);
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
        const next = new Set(prev);
        next.delete(id);
        return next;
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

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const expiredInvites = invites.filter((i) => i.status === "EXPIRED");

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Workers Management</h2>
      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        <WorkerForm onInviteSent={handleInviteSent} />

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Pending Invites <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">({pendingInvites.length})</span>
            </h4>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex flex-col gap-2 rounded-lg card-panel p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{inv.email}</p>
                    <p className="text-xs text-amber-400">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
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
                    <button
                      onClick={() => handleCancel(inv.id)}
                      className="h-8 px-3 text-xs font-medium rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired invites */}
        {expiredInvites.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">
              Expired Invites <span className="ml-1 text-xs font-normal">({expiredInvites.length})</span>
            </h4>
            <div className="space-y-2">
              {expiredInvites.map((inv) => (
                <div key={inv.id} className="flex flex-col gap-2 rounded-lg card-panel p-4 opacity-60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{inv.email}</p>
                    <p className="text-xs text-red-400">Expired</p>
                  </div>
                  <button
                    onClick={() => handleResend(inv.id)}
                    disabled={resendingIds.has(inv.id)}
                    className="h-8 px-3 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                  >
                    {resendingIds.has(inv.id) ? "Sending..." : "Resend"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active workers */}
        <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          Active Workers <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">({workers.length})</span>
        </h4>
        <WorkersList workers={workers} onDelete={deleteUser} canDelete={true} />
      </div>
    </div>
  );
}
