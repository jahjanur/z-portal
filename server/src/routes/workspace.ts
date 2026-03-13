import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

/** Workspace overview for admin: counts and critical alerts */
router.get("/overview", verifyJWT, verifyAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      workersCount,
      clientsCount,
      activeTasksCount,
      unpaidInvoicesCount,
      domainsExpiringSoonCount,
      workersWithIncompleteTasksCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "WORKER" } }),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
      prisma.invoice.count({ where: { status: { not: "PAID" } } }),
      prisma.domain.count({
        where: {
          expirationDate: { gte: now, lte: in30Days },
        },
      }),
      prisma.user.count({
        where: {
          role: "WORKER",
          taskAssignments: {
            some: {
              task: { status: { not: "COMPLETED" } },
            },
          },
        },
      }),
    ]);

    return res.json({
      workers: workersCount,
      clients: clientsCount,
      activeTasks: activeTasksCount,
      unpaidInvoices: unpaidInvoicesCount,
      domainsExpiringSoon: domainsExpiringSoonCount,
      workersWithIncompleteTasks: workersWithIncompleteTasksCount,
    });
  } catch (err) {
    console.error("Workspace overview error:", err);
    return res.status(500).json({ message: "Failed to load workspace overview" });
  }
});

export default router;
