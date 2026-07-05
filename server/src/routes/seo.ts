import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { clientScopeId } from "../lib/clientScope";
import { DEFAULT_SEO_PACKAGES } from "../constants/seoCatalog";

const router = Router();

export const SEO_STATUSES = [
  "AWAITING_INFO",
  "INFO_RECEIVED",
  "SENT_TO_PROVIDER",
  "IN_PROGRESS",
  "DELIVERED",
  "CANCELLED",
] as const;

/** Strip buy-side (provider) fields for non-admin eyes. */
function publicPackage<T extends Record<string, unknown>>(pkg: T) {
  const { providerName, providerPackage, providerCost, providerListPrice, ...rest } = pkg;
  return rest;
}

/** Normalise an incoming keywords payload to [{keyword, targetUrl}]. */
function parseKeywords(raw: unknown, max: number): { keyword: string; targetUrl: string | null }[] | { error: string } {
  if (!Array.isArray(raw)) return { error: "keywords must be a list" };
  const cleaned = raw
    .map((k: any) => ({
      keyword: String(k?.keyword ?? "").trim().slice(0, 200),
      targetUrl: k?.targetUrl ? String(k.targetUrl).trim().slice(0, 500) : null,
    }))
    .filter((k) => k.keyword);
  if (cleaned.length === 0) return { error: "At least one keyword is required" };
  if (cleaned.length > max) return { error: `This package allows up to ${max} keywords` };
  return cleaned;
}

// ------------------------------- Packages ---------------------------------

// List packages. Admin: all (incl. inactive + provider spec). Others: active,
// sell-side fields only.
router.get("/packages", verifyJWT, async (req: any, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";
    const packages = await prisma.seoPackage.findMany({
      where: isAdmin ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    res.json(isAdmin ? packages : packages.map((p) => publicPackage(p as any)));
  } catch (e) {
    console.error("Error listing SEO packages:", e);
    res.status(500).json({ error: "Failed to load packages" });
  }
});

// Seed / refresh the four default packages. Missing ones are created; existing
// ones (matched by name) have their CONTENT refreshed to the latest catalog
// (positioning, features, content pieces, backlink profile, provider spec…) so
// old data is cleaned up — while the admin's price and active toggle are kept.
router.post("/packages/seed-defaults", verifyJWT, verifyAdmin, async (_req, res) => {
  try {
    const existing = await prisma.seoPackage.findMany();
    const byName = new Map(existing.map((p) => [p.name, p]));
    let created = 0;
    let updated = 0;
    for (const def of DEFAULT_SEO_PACKAGES) {
      const found = byName.get(def.name);
      if (!found) {
        await prisma.seoPackage.create({ data: def as any });
        created += 1;
      } else {
        // refresh content but preserve the admin's price + active state
        const { price, currency, ...content } = def as any;
        void price; void currency;
        await prisma.seoPackage.update({ where: { id: found.id }, data: content });
        updated += 1;
      }
    }
    const packages = await prisma.seoPackage.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    res.json({ created, updated, packages });
  } catch (e) {
    console.error("Error seeding SEO packages:", e);
    res.status(500).json({ error: "Failed to seed packages" });
  }
});

const PACKAGE_FIELDS = [
  "name", "positioning", "active", "sortOrder", "price", "currency", "features",
  "highlights", "providerName", "providerPackage", "providerCost", "providerListPrice",
  "backlinks", "packageItems", "maxKeywords", "deliveryDaysMin", "deliveryDaysMax",
  "processingHours", "guaranteeMonths", "contentPieces", "backlinkProfile",
] as const;

function pickPackageData(body: any) {
  const data: any = {};
  for (const f of PACKAGE_FIELDS) if (body[f] !== undefined) data[f] = body[f];
  // numeric coercion for form-sent values
  for (const n of ["price", "providerCost", "providerListPrice", "backlinks", "packageItems", "maxKeywords", "deliveryDaysMin", "deliveryDaysMax", "processingHours", "guaranteeMonths", "sortOrder"]) {
    if (data[n] !== undefined && data[n] !== null && data[n] !== "") data[n] = Number(data[n]);
    else if (data[n] === "") data[n] = null;
  }
  return data;
}

router.post("/packages", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const data = pickPackageData(req.body);
    if (!data.name || !Number.isFinite(data.price)) return res.status(400).json({ error: "Name and price are required" });
    for (const required of ["backlinks", "packageItems", "maxKeywords", "deliveryDaysMin", "deliveryDaysMax"]) {
      if (!Number.isFinite(data[required])) return res.status(400).json({ error: `${required} is required` });
    }
    const pkg = await prisma.seoPackage.create({ data });
    res.status(201).json(pkg);
  } catch (e) {
    console.error("Error creating SEO package:", e);
    res.status(500).json({ error: "Failed to create package" });
  }
});

router.put("/packages/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = pickPackageData(req.body);
    const pkg = await prisma.seoPackage.update({ where: { id }, data });
    res.json(pkg);
  } catch (e) {
    console.error("Error updating SEO package:", e);
    res.status(500).json({ error: "Failed to update package" });
  }
});

router.delete("/packages/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const orderCount = await prisma.seoOrder.count({ where: { packageId: id } });
    if (orderCount > 0) {
      return res.status(400).json({ error: "This package has orders — deactivate it instead of deleting" });
    }
    await prisma.seoPackage.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting SEO package:", e);
    res.status(500).json({ error: "Failed to delete package" });
  }
});

// -------------------------------- Orders ----------------------------------

const ORDER_INCLUDE = {
  package: true,
  client: { select: { id: true, name: true, email: true, company: true } },
  task: { select: { id: true, title: true, status: true } },
} as const;

/** Sanitize an order for non-admin eyes (strip package provider fields). */
function publicOrder(order: any) {
  return { ...order, package: order.package ? publicPackage(order.package) : order.package };
}

// List orders. Admin: all. Client: own company's. Worker: ones whose linked
// task they're assigned to.
router.get("/orders", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    let where: any;
    if (role === "ADMIN") where = undefined;
    else if (role === "CLIENT") where = { clientId: clientScopeId(req.user) };
    else if (role === "WORKER") where = { task: { workers: { some: { userId } } } };
    else if (role === "ERASPHERE") {
      const referred = await prisma.user.findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } });
      where = { clientId: { in: referred.map((c) => c.id) } };
    } else where = { id: -1 };

    const orders = await prisma.seoOrder.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" } });
    res.json(role === "ADMIN" ? orders : orders.map(publicOrder));
  } catch (e) {
    console.error("Error listing SEO orders:", e);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Activate a package for a client → creates the linked SEO task + notifies.
router.post("/orders", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const packageId = Number(req.body.packageId);
    const clientId = Number(req.body.clientId);
    const invoiceId = req.body.invoiceId ? Number(req.body.invoiceId) : null;
    if (!Number.isInteger(packageId) || !Number.isInteger(clientId)) {
      return res.status(400).json({ error: "packageId and clientId are required" });
    }
    const [pkg, client] = await Promise.all([
      prisma.seoPackage.findUnique({ where: { id: packageId } }),
      prisma.user.findUnique({ where: { id: clientId }, select: { id: true, role: true, name: true } }),
    ]);
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    if (!client || client.role !== "CLIENT") return res.status(400).json({ error: "Invalid client" });

    const task = await prisma.task.create({
      data: {
        title: `SEO — ${pkg.name} backlink campaign`,
        description: `${pkg.positioning ?? ""} · ${pkg.backlinks} authority backlinks · delivery ${pkg.deliveryDaysMin}–${pkg.deliveryDaysMax} business days`.trim(),
        status: "PENDING",
        clientId,
      },
    });
    const order = await prisma.seoOrder.create({
      data: { packageId, clientId, invoiceId, taskId: task.id },
      include: ORDER_INCLUDE,
    });

    prisma.notification
      .create({
        data: {
          userId: clientId,
          type: "SEO_ACTIVATED",
          title: `Your ${pkg.name} SEO package is active`,
          message: `Add your website, sector and keywords so we can start work.`,
          link: `/tasks/${task.id}`,
          read: false,
        },
      })
      .catch((e) => console.error("SEO activation notification failed:", e));

    res.status(201).json(order);
  } catch (e) {
    console.error("Error activating SEO order:", e);
    res.status(500).json({ error: "Failed to activate package" });
  }
});

type OrderAuth =
  | { ok: false; status: 404 | 403 }
  | { ok: true; order: any; isAdmin: boolean };

async function loadOrderAuthorized(orderId: number, user: any): Promise<OrderAuth> {
  const order = await prisma.seoOrder.findUnique({
    where: { id: orderId },
    include: { ...ORDER_INCLUDE, task: { select: { id: true, title: true, status: true, workers: { select: { userId: true } } } } },
  });
  if (!order) return { ok: false, status: 404 };
  const { role, userId } = user;
  if (role === "ADMIN") return { ok: true, order, isAdmin: true };
  if (role === "CLIENT" && order.clientId === clientScopeId(user)) return { ok: true, order, isAdmin: false };
  if (role === "WORKER" && (order.task?.workers ?? []).some((w: any) => w.userId === userId)) return { ok: true, order, isAdmin: false };
  if (role === "ERASPHERE") {
    const referred = await prisma.user.findFirst({ where: { id: order.clientId, referredById: userId }, select: { id: true } });
    if (referred) return { ok: true, order, isAdmin: false };
  }
  return { ok: false, status: 403 };
}

router.get("/orders/:id", verifyJWT, async (req: any, res) => {
  try {
    const result = await loadOrderAuthorized(Number(req.params.id), req.user);
    if (!result.ok) return res.status(result.status).json({ error: result.status === 404 ? "Order not found" : "Not authorized" });
    res.json(result.isAdmin ? result.order : publicOrder(result.order));
  } catch (e) {
    console.error("Error loading SEO order:", e);
    res.status(500).json({ error: "Failed to load order" });
  }
});

// Intake (client or admin) + status changes (admin only).
router.patch("/orders/:id", verifyJWT, async (req: any, res) => {
  try {
    const result = await loadOrderAuthorized(Number(req.params.id), req.user);
    if (!result.ok) return res.status(result.status).json({ error: result.status === 404 ? "Order not found" : "Not authorized" });
    const { order, isAdmin } = result;
    const isOwnerClient = req.user.role === "CLIENT" && order.clientId === clientScopeId(req.user);
    const data: any = {};

    // Intake fields — the owning client (until sent to provider) or admin anytime.
    const intakeKeys = ["websiteUrl", "sector", "language", "chooseLinks", "keywords", "note"];
    const hasIntake = intakeKeys.some((k) => req.body[k] !== undefined);
    if (hasIntake) {
      const locked = ["SENT_TO_PROVIDER", "IN_PROGRESS", "DELIVERED", "CANCELLED"].includes(order.status);
      if (!isAdmin && (!isOwnerClient || locked)) {
        return res.status(403).json({ error: locked ? "The order was already sent to the provider — contact us to change details" : "Not authorized" });
      }
      if (req.body.websiteUrl !== undefined) data.websiteUrl = String(req.body.websiteUrl).trim().slice(0, 500) || null;
      if (req.body.sector !== undefined) data.sector = String(req.body.sector).trim().slice(0, 200) || null;
      if (req.body.language !== undefined) data.language = String(req.body.language).trim().slice(0, 100) || null;
      if (req.body.chooseLinks !== undefined) data.chooseLinks = !!req.body.chooseLinks;
      if (req.body.note !== undefined) data.note = String(req.body.note).trim().slice(0, 2000) || null;
      if (req.body.keywords !== undefined) {
        const parsed = parseKeywords(req.body.keywords, order.package.maxKeywords);
        if ("error" in parsed) return res.status(400).json({ error: parsed.error });
        data.keywords = parsed;
      }
      // Submitting complete intake moves AWAITING_INFO → INFO_RECEIVED.
      const websiteAfter = data.websiteUrl !== undefined ? data.websiteUrl : order.websiteUrl;
      const keywordsAfter = data.keywords !== undefined ? data.keywords : order.keywords;
      if (order.status === "AWAITING_INFO" && websiteAfter && Array.isArray(keywordsAfter) && keywordsAfter.length > 0) {
        data.status = "INFO_RECEIVED";
        data.infoAt = new Date();
      }
    }

    // Status changes — admin only.
    if (req.body.status !== undefined) {
      if (!isAdmin) return res.status(403).json({ error: "Only admins can change the order status" });
      const status = String(req.body.status);
      if (!SEO_STATUSES.includes(status as any)) return res.status(400).json({ error: "Invalid status" });
      data.status = status;
      data.completedAt = status === "DELIVERED" ? new Date() : null;
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });

    const updated = await prisma.seoOrder.update({ where: { id: order.id }, data, include: ORDER_INCLUDE });

    // Notify: intake received → admins; status change → client.
    if (data.status === "INFO_RECEIVED" && !isAdmin) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      prisma.notification
        .createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "SEO_INFO_RECEIVED",
            title: "SEO intake received",
            message: `${updated.client?.name ?? "A client"} submitted keywords for the ${updated.package.name} package.`,
            link: updated.taskId ? `/tasks/${updated.taskId}` : "/admin/zulbera/seo",
            read: false,
          })),
        })
        .catch((e) => console.error("SEO intake notification failed:", e));
    } else if (req.body.status !== undefined && isAdmin && updated.clientId) {
      const labels: Record<string, string> = {
        INFO_RECEIVED: "Your SEO order details were received",
        SENT_TO_PROVIDER: "Your SEO campaign was sent to our link-building team",
        IN_PROGRESS: "Your SEO campaign is in progress",
        DELIVERED: "Your SEO campaign is delivered 🎉",
        CANCELLED: "Your SEO order was cancelled",
      };
      if (labels[String(req.body.status)]) {
        prisma.notification
          .create({
            data: {
              userId: updated.clientId,
              type: "SEO_STATUS",
              title: labels[String(req.body.status)],
              message: `${updated.package.name} package — ${updated.package.backlinks} backlinks.`,
              link: updated.taskId ? `/tasks/${updated.taskId}` : "/dashboard",
              read: false,
            },
          })
          .catch((e) => console.error("SEO status notification failed:", e));
      }
    }

    res.json(isAdmin ? updated : publicOrder(updated));
  } catch (e) {
    console.error("Error updating SEO order:", e);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Delete an order (admin) — also removes the linked task (chat/files cascade).
router.delete("/orders/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.seoOrder.findUnique({ where: { id }, select: { id: true, taskId: true } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    await prisma.seoOrder.delete({ where: { id } });
    if (order.taskId) {
      await prisma.task.delete({ where: { id: order.taskId } }).catch((e) => console.error("Linked task cleanup failed:", e));
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting SEO order:", e);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
