import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Skeleton";

export interface UnifiedComment {
  id: string;
  type: "task" | "file";
  taskId: number;
  taskTitle: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  visibleToClient: boolean;
  fileId?: number;
  fileName?: string;
}

type TabFilter = "internal" | "client";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const ROLE_TONE: Record<string, BadgeTone> = {
  ADMIN: "neutral",
  CLIENT: "info",
  WORKER: "warning",
  ERASPHERE: "success",
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<UnifiedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("internal");
  const [unreadByRole, setUnreadByRole] = useState<{ total: number; byRole: { CLIENT: number; WORKER: number } }>({
    total: 0,
    byRole: { CLIENT: 0, WORKER: 0 },
  });

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get<{ comments: UnifiedComment[] }>("/comments/recent", {
        params: { limit: 80, threadFilter: tab },
      });
      setComments(data.comments ?? []);
    } catch (e) {
      setError("Failed to load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const fetchUnreadByRole = useCallback(async () => {
    try {
      const { data } = await API.get<{ total: number; byRole: { CLIENT: number; WORKER: number } }>(
        "/notifications/unread-counts-by-role"
      );
      setUnreadByRole({
        total: data?.total ?? 0,
        byRole: data?.byRole ?? { CLIENT: 0, WORKER: 0 },
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    fetchUnreadByRole();
    const interval = setInterval(fetchUnreadByRole, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadByRole]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="Comments"
        subtitle="Worker tab: internal notes between admin and workers. Client tab: comments between admin and client. Click a comment to open the task."
      >
        {/* Segmented filter pills — horizontal scroll on mobile */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="inline-flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
            {(
              [
                { key: "internal" as TabFilter, label: "Worker comments", count: unreadByRole.byRole.WORKER },
                { key: "client" as TabFilter, label: "Client comments", count: unreadByRole.byRole.CLIENT },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === key
                    ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <span>{label}</span>
                {typeof count === "number" && count > 0 && (
                  <span className="badge badge-info px-1.5 py-0 text-[0.6875rem]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <EmptyState
          compact
          title={error}
          description="Something went wrong while fetching comments."
          action={
            <Button variant="primary" size="sm" onClick={fetchComments}>
              Retry
            </Button>
          }
        />
      ) : comments.length === 0 ? (
        <EmptyState
          title={tab === "internal" ? "No worker comments yet" : "No client comments yet"}
          description={
            tab === "internal"
              ? "Internal notes between admin and workers will appear here."
              : "Comments between admin and client will appear here."
          }
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {comments.map((c) => (
            <Link
              key={c.id}
              to={c.type === "file" ? `/tasks/${c.taskId}?highlightFileComment=${c.id.replace("file-", "")}` : `/tasks/${c.taskId}?highlightComment=${c.id.replace("task-", "")}`}
              className="card-panel row-hover block rounded-xl p-5 sm:p-6"
            >
              {/* Author / time header */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <StatusBadge tone={ROLE_TONE[c.authorRole] ?? "neutral"}>{c.authorRole}</StatusBadge>
                  <span className="font-semibold text-[var(--color-text-primary)]">{c.authorName}</span>
                  {c.type === "file" && c.fileName && (
                    <span className="text-xs text-[var(--color-text-muted)]">on file: {c.fileName}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{formatDate(c.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">Task: {c.taskTitle}</p>
              <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] line-clamp-2">{c.content}</p>
              {c.visibleToClient && (
                <span className="badge badge-info mt-2.5">Visible to client</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
