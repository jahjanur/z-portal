import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// Get current user's notifications (newest first, limit 50)
router.get("/", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
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

export default router;
