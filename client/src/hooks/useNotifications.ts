import { useState, useEffect, useCallback, useRef } from "react";
import API from "../api";
import { playNotificationSound, playForNotificationType } from "../utils/sound";

// Shared across all hook instances so only one sound fires per new notification.
let lastSeenCount: number | null = null;

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await API.get("/notifications/unread-count");
      const c: number = data.count ?? 0;
      if (lastSeenCount !== null && c > lastSeenCount) {
        // A new notification arrived — play a sound matched to the latest one.
        try {
          const { data: nd } = await API.get("/notifications?page=1&limit=1");
          const latest = (nd.notifications ?? nd)?.[0];
          playForNotificationType(latest?.type);
        } catch {
          playNotificationSound();
        }
      }
      lastSeenCount = c;
      setUnreadCount(c);
    } catch {
      // silently fail
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await API.get("/notifications?page=1&limit=20");
      const items: Notification[] = data.notifications ?? data;
      setNotifications(items);
      const unread = items.filter((n) => !n.read).length;
      lastSeenCount = unread; // keep the shared counter in sync (avoid false sound triggers)
      setUnreadCount(unread);
    } catch {
      // silently fail
    }
  }, []);

  const markRead = useCallback(async (id: number) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
