import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { getAppSettings } from "./settings";
import { convert } from "../lib/currency";

const router = Router();

/** Workspace overview for admin: counts and critical alerts */
router.get("/overview", verifyJWT, verifyAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const in14Days = new Date(now);
    in14Days.setDate(in14Days.getDate() + 14);
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      workersCount,
      clientsCount,
      activeTasksCount,
      unpaidInvoicesCount,
      domainsExpiringInOneWeek,
      domainsExpiringInTwoWeeks,
      domainsExpiringIn30Days,
      workersWithIncompleteTasksCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "WORKER" } }),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
      prisma.invoice.count({ where: { status: { not: "PAID" } } }),
      prisma.domain.count({
        where: {
          expirationDate: { gte: now, lte: in7Days },
        },
      }),
      prisma.domain.count({
        where: {
          expirationDate: { gt: in7Days, lte: in14Days },
        },
      }),
      prisma.domain.count({
        where: {
          expirationDate: { gt: in14Days, lte: in30Days },
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

    const domainsExpiringSoon =
      domainsExpiringInOneWeek + domainsExpiringInTwoWeeks + domainsExpiringIn30Days;

    return res.json({
      workers: workersCount,
      clients: clientsCount,
      activeTasks: activeTasksCount,
      unpaidInvoices: unpaidInvoicesCount,
      domainsExpiringSoon,
      domainsExpiringInOneWeek,
      domainsExpiringInTwoWeeks,
      domainsExpiringIn30Days,
      workersWithIncompleteTasks: workersWithIncompleteTasksCount,
    });
  } catch (err) {
    console.error("Workspace overview error:", err);
    return res.status(500).json({ message: "Failed to load workspace overview" });
  }
});

/** EraSphere overview for admin: partners, referred clients, tasks, revenue (sidebar). */
router.get("/erasphere-overview", verifyJWT, verifyAdmin, async (_req, res) => {
  try {
    const partners = await prisma.user.findMany({
      where: { role: "ERASPHERE" },
      select: { id: true },
    });
    const partnerIds = partners.map((p) => p.id);

    const referredClients = await prisma.user.findMany({
      where: { role: "CLIENT", referredById: { in: partnerIds } },
      select: { id: true },
    });
    const clientIds = referredClients.map((c) => c.id);

    const [activeTasks, completedTasks, invoices] = await Promise.all([
      prisma.task.count({
        where: { clientId: { in: clientIds }, status: { not: "COMPLETED" } },
      }),
      prisma.task.count({
        where: { clientId: { in: clientIds }, status: "COMPLETED" },
      }),
      prisma.invoice.findMany({
        where: { clientId: { in: clientIds } },
        select: { amount: true, currency: true, status: true },
      }),
    ]);

    const s = await getAppSettings();
    const r = (n: number) => Math.round(n * 100) / 100;
    const totalRevenue = r(invoices.reduce((sum, inv) => sum + convert(inv.amount, inv.currency || "USD", s.displayCurrency, s), 0));
    const pendingRevenue = r(
      invoices
        .filter((inv) => inv.status !== "PAID")
        .reduce((sum, inv) => sum + convert(inv.amount, inv.currency || "USD", s.displayCurrency, s), 0)
    );

    return res.json({
      partners: partnerIds.length,
      referredClients: referredClients.length,
      activeTasks,
      completedTasks,
      totalTasks: activeTasks + completedTasks,
      totalRevenue,
      pendingRevenue,
      currency: s.displayCurrency,
    });
  } catch (err) {
    console.error("EraSphere overview error:", err);
    return res.status(500).json({ message: "Failed to load EraSphere overview" });
  }
});

export default router;
