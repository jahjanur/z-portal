import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import { SkeletonRows } from "../components/ui/Skeleton";
import { timeAgo } from "../utils";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
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
    if (n.link && n.link.startsWith("/") && !n.link.includes("://")) navigate(n.link);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          subtitle="Everything that needs your attention, in one place."
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings/notifications")}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </Button>
            </>
          }
        />

        {loading ? (
          <SkeletonRows rows={6} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            }
            title="All caught up!"
            description="You have no notifications yet."
          />
        ) : (
          <>
            <div className="space-y-3 stagger-children">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`card-panel row-hover flex w-full items-start gap-4 px-5 py-4 text-left ${
                    !n.read ? "border-l-2 border-l-[var(--color-info-text)]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-info-text)]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{n.message}</p>
                    <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.link && (
                    <svg className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchPage} />
          </>
        )}
      </div>
    </div>
  );
}
