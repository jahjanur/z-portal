import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import WorkerForm from "../../components/admin/WorkerForm";
import WorkersList from "../../components/admin/WorkersList";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
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
  const formRef = useRef<HTMLDivElement>(null);

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
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
      <PageHeader
        title="Workers"
        subtitle="Invite team members and manage worker accounts"
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
            Add Worker
          </Button>
        }
      />

      <div ref={formRef} className="scroll-mt-24">
        <WorkerForm onInviteSent={handleInviteSent} />
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h4 className="section-title">
            Pending Invites <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">({pendingInvites.length})</span>
          </h4>
          <div className="stagger-children space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="card-panel row-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">{inv.email}</p>
                  <div className="mt-1.5">
                    <StatusBadge tone="warning">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </StatusBadge>
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
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => handleCancel(inv.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expired invites */}
      {expiredInvites.length > 0 && (
        <section>
          <h4 className="section-title text-[var(--color-text-muted)]">
            Expired Invites <span className="ml-1 text-xs font-normal">({expiredInvites.length})</span>
          </h4>
          <div className="stagger-children space-y-3">
            {expiredInvites.map((inv) => (
              <div key={inv.id} className="card-panel row-hover flex flex-col gap-3 p-4 opacity-70 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{inv.name}</p>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">{inv.email}</p>
                  <div className="mt-1.5">
                    <StatusBadge status="EXPIRED" />
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active workers */}
      <section>
        <h4 className="section-title">
          Active Workers <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">({workers.length})</span>
        </h4>
        <WorkersList workers={workers} onDelete={deleteUser} canDelete={true} />
      </section>
    </div>
  );
}
