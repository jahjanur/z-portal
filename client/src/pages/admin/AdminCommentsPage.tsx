import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../../api";

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

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "CLIENT": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "WORKER": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "ERASPHERE": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default: return "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]";
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="mt-6 rounded-2xl card-panel p-6 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">Comments</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Worker tab: internal notes between admin and workers. Client tab: comments between admin and client. Click a comment to open the task.
        </p>

        {/* 2 tabs: Worker comments (admin–worker) | Client comments (admin–client) with notification badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              { key: "internal" as TabFilter, label: "Worker comments (admin & worker)", count: unreadByRole.byRole.WORKER },
              { key: "client" as TabFilter, label: "Client comments (admin & client)", count: unreadByRole.byRole.CLIENT },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border-[var(--color-tab-active-border)]"
                  : "border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)]"
              }`}
            >
              <span>{label}</span>
              {typeof count === "number" && count > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-destructive-bg)] px-1.5 text-xs font-bold text-[var(--color-destructive-text)]">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce opacity-70" style={{ animationDelay: "0.1s" }} />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce opacity-50" style={{ animationDelay: "0.2s" }} />
              </div>
              <span className="text-sm text-[var(--color-text-muted)]">Loading comments…</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6 text-center">
            <p className="text-[var(--color-destructive-text)]">{error}</p>
            <button onClick={fetchComments} className="btn-primary mt-4 rounded-full px-4 py-2 text-sm">Retry</button>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] py-12 text-center">
            <p className="text-[var(--color-text-muted)]">
              {tab === "internal" ? "No worker comments yet." : "No client comments yet."}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {tab === "internal"
                ? "Internal notes between admin and workers will appear here."
                : "Comments between admin and client will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <Link
                key={c.id}
                to={c.type === "file" ? `/tasks/${c.taskId}?highlightFileComment=${c.id.replace("file-", "")}` : `/tasks/${c.taskId}?highlightComment=${c.id.replace("task-", "")}`}
                className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(c.authorRole)}`}>
                      {c.authorRole}
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{c.authorName}</span>
                    {c.type === "file" && c.fileName && (
                      <span className="text-xs text-[var(--color-text-muted)]">on file: {c.fileName}</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">{formatDate(c.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">Task: {c.taskTitle}</p>
                <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] line-clamp-2">{c.content}</p>
                {c.visibleToClient && (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">Visible to client</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
