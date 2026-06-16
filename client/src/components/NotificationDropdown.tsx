import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { timeAgo } from "../utils";
import Button from "./ui/Button";

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
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-1 text-[10px] font-bold text-[var(--color-destructive-text)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown: render via portal so it's visible on mobile (not clipped by navbar) */}
      {open &&
        createPortal(
          <div
            data-notification-dropdown
            className="animate-scale-in w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-solid)] shadow-elev-lg"
            style={dropdownStyle}
          >
            {/* Header: title, Mark all read, X */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="whitespace-nowrap"
                  >
                    Mark all read
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
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
                <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    You're all caught up
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    No notifications yet
                  </p>
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
                      className="row-hover flex w-full items-start gap-3 px-4 py-3 text-left"
                    >
                      <div className="mt-0.5 shrink-0">
                        <svg
                          className={`h-5 w-5 ${!n.read ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
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
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-info-text)]"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* View all link */}
            <div className="border-t border-[var(--color-border)] p-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigate("/notifications");
                  setOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
