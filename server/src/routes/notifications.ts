import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import prisma from "../lib/prisma";
import { ALL_EVENT_TYPES, CRITICAL_ADMIN_EVENTS } from "../services/notificationEngine";

const router = Router();

// Get current user's notifications (supports pagination)
router.get("/", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    res.json({ notifications, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get unread count
router.get("/unread-count", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Get unread counts by role (for admin comments page: comment notification badges per tab)
router.get("/unread-counts-by-role", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const [total, clientCount, workerCount] = await Promise.all([
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.notification.count({
        where: { userId, read: false, type: "TASK_COMMENT_ADDED", sourceRole: "CLIENT" },
      }),
      prisma.notification.count({
        where: { userId, read: false, type: "TASK_COMMENT_ADDED", sourceRole: "WORKER" },
      }),
    ]);
    res.json({
      total,
      byRole: { CLIENT: clientCount, WORKER: workerCount },
    });
  } catch (error) {
    console.error("Error fetching unread counts by role:", error);
    res.status(500).json({ error: "Failed to fetch unread counts" });
  }
});

// Get unread counts for a task by thread (for task detail page tab badges)
router.get("/unread-by-task", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const taskId = Number(req.query.taskId);
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: "taskId is required" });
    }
    const [internal, client] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          read: false,
          type: "TASK_COMMENT_ADDED",
          taskId,
          threadType: "internal",
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
          type: "TASK_COMMENT_ADDED",
          taskId,
          threadType: "client",
        },
      }),
    ]);
    res.json({ internal, client });
  } catch (error) {
    console.error("Error fetching unread by task:", error);
    res.status(500).json({ error: "Failed to fetch unread by task" });
  }
});

// Mark all notifications as read (MUST come before /:id/read)
router.patch("/read-all", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// Mark notifications as read for a task + thread (when user views that tab on task detail)
router.patch("/mark-read-for-task", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { taskId, threadType } = req.body;
    const tid = Number(taskId);
    if (!tid || isNaN(tid)) {
      return res.status(400).json({ error: "taskId is required" });
    }
    if (threadType !== "internal" && threadType !== "client") {
      return res.status(400).json({ error: "threadType must be internal or client" });
    }
    await prisma.notification.updateMany({
      where: { userId, taskId: tid, threadType, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications read for task:", error);
    res.status(500).json({ error: "Failed to mark read for task" });
  }
});

// Mark one notification as read
router.patch("/:id/read", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const id = Number(req.params.id);

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// ─── Notification Preferences ────────────────────────────────────────────────

// GET preferences for current user
router.get("/preferences", verifyJWT, async (req: any, res) => {
  try {
    const { userId, role } = req.user;
    const prefs = await prisma.notificationPreference.findMany({ where: { userId } });

    const prefMap = new Map(prefs.map((p) => [p.eventType, p]));
    const result = ALL_EVENT_TYPES.map((et) => {
      const existing = prefMap.get(et);
      const isCritical = role === "ADMIN" && CRITICAL_ADMIN_EVENTS.includes(et as any);
      return {
        eventType: et,
        inAppEnabled: existing ? existing.inAppEnabled : true,
        emailEnabled: existing ? existing.emailEnabled : true,
        critical: isCritical,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// PATCH preferences for current user
router.patch("/preferences", verifyJWT, async (req: any, res) => {
  try {
    const { userId, role } = req.user;
    const updates: { eventType: string; inAppEnabled?: boolean; emailEnabled?: boolean }[] = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Expected an array of preference updates" });
    }

    for (const u of updates) {
      if (!u.eventType || !ALL_EVENT_TYPES.includes(u.eventType as any)) continue;

      // Admins cannot disable critical events
      const isCritical = role === "ADMIN" && CRITICAL_ADMIN_EVENTS.includes(u.eventType as any);
      if (isCritical) {
        if (u.inAppEnabled === false && u.emailEnabled === false) continue;
      }

      await prisma.notificationPreference.upsert({
        where: { userId_eventType: { userId, eventType: u.eventType } },
        create: {
          userId,
          eventType: u.eventType,
          inAppEnabled: u.inAppEnabled ?? true,
          emailEnabled: u.emailEnabled ?? true,
        },
        update: {
          ...(u.inAppEnabled !== undefined && { inAppEnabled: u.inAppEnabled }),
          ...(u.emailEnabled !== undefined && { emailEnabled: u.emailEnabled }),
        },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return res.status(500).json({ error: "Failed to update preferences" });
  }
});

export default router;
