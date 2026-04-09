import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  TASK_CREATED: "M12 6v6m0 0v6m0-6h6m-6 0H6",
  TASK_COMPLETED: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  TASK_UPDATED: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  TASK_PENDING_APPROVAL: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  INVOICE_CREATED: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
  INVOICE_PAID: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  ERASPHERE_NEW_CLIENT: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  ERASPHERE_NEW_TASK: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotifications();

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const padding = 12;
    const dropdownWidth = Math.min(320, window.innerWidth - padding * 2);
    const left = Math.max(padding, Math.min(rect.left, window.innerWidth - dropdownWidth - padding));
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left,
      width: dropdownWidth,
      zIndex: 9999,
    });
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      const el = e.target as Element;
      if (el.closest?.("[data-notification-dropdown]")) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClearAll = () => {
    markAllRead();
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown: render via portal so it's visible on mobile (not clipped by navbar) */}
      {open &&
        createPortal(
          <div
            data-notification-dropdown
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-xl w-80 max-w-[calc(100vw-24px)]"
            style={dropdownStyle}
          >
            {/* Header: title, Clear all, X */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-medium text-[var(--color-btn-primary-bg)] hover:underline whitespace-nowrap"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition"
                  aria-label="Close notifications"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  const iconPath =
                    TYPE_ICONS[n.type] ||
                    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={async () => {
                        if (!n.read) await markRead(n.id);
                        setOpen(false);
                        if (n.link && n.link.startsWith("/") && !n.link.includes("://")) navigate(n.link);
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-2)] ${
                        !n.read ? "bg-[var(--color-surface-2)]/50" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <svg
                          className={`h-5 w-5 ${!n.read ? "text-[var(--color-btn-primary-bg)]" : "text-[var(--color-text-muted)]"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={iconPath}
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${!n.read ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)] line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-btn-primary-bg)]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* View all link */}
            <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => {
                  navigate("/notifications");
                  setOpen(false);
                }}
                className="text-xs font-medium text-[var(--color-btn-primary-bg)] hover:underline"
              >
                View all notifications
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
