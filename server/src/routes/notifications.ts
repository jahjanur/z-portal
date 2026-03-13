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
