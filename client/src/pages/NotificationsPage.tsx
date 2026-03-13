import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await API.get(`/notifications?page=${p}&limit=20`);
      setNotifications(data.notifications);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleMarkAllRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await API.patch(`/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        // silently fail
      }
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-20 pb-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Notifications</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-[var(--color-btn-primary-bg)] hover:underline"
          >
            Mark all as read
          </button>
          <button
            onClick={() => navigate("/settings/notifications")}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl card-panel p-12 text-center text-[var(--color-text-muted)]">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl card-panel p-12 text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-[var(--color-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">All caught up!</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">You have no notifications yet.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl card-panel shadow-xl overflow-hidden divide-y divide-[var(--color-border)]">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-surface-2)] ${
                  !n.read ? "bg-[var(--color-surface-2)]/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                      {n.title}
                    </p>
                    {!n.read && <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-btn-primary-bg)]" />}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{n.message}</p>
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{timeAgo(n.createdAt)}</p>
                </div>
                {n.link && (
                  <svg className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1}
                className="h-9 px-4 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] disabled:opacity-40 hover:bg-[var(--color-surface-3)] transition"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--color-text-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchPage(page + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] disabled:opacity-40 hover:bg-[var(--color-surface-3)] transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
