import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { clientScopeId } from "../lib/clientScope";

const router = Router();

const clientSelect = {
  id: true,
  name: true,
  company: true,
  email: true,
};

/** Compute expiration date from activation + lifespan years. */
function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

const CURRENCIES = ["USD", "EUR", "CAD"];
const BILLING_CYCLES = ["MONTHLY", "YEARLY"];

/** Parse a money amount to a non-negative number, or null when blank/invalid. */
function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// get all servers for a client (admin: any client; CLIENT: only own)
router.get("/client/:clientId", verifyJWT, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const role = req.user?.role;

    let effectiveClientId: number;
    if (role === "CLIENT") {
      effectiveClientId = clientScopeId(req.user);
    } else if (role === "ADMIN") {
      effectiveClientId = Number(clientId);
    } else {
      return res.status(403).json({ error: "Only admins can view other clients' servers" });
    }

    const servers = await prisma.server.findMany({
      where: { clientId: effectiveClientId },
      include: { client: { select: clientSelect } },
      orderBy: [{ createdAt: "desc" }],
    });

    res.json(servers);
  } catch (error) {
    console.error("Error fetching servers:", error);
    res.status(500).json({ error: "Failed to fetch servers" });
  }
});

// get one server (admin only)
router.get("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: Number(req.params.id) },
      include: { client: { select: clientSelect } },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    res.json(server);
  } catch (error) {
    console.error("Error fetching server:", error);
    res.status(500).json({ error: "Failed to fetch server" });
  }
});

// create new server
router.post("/", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const {
      clientId,
      label,
      provider,
      ipAddress,
      plan,
      location,
      notes,
      activationDate: activationDateRaw,
      expirationDate: expirationDateRaw,
      lifespanYears,
      status: statusBody,
      price: priceRaw,
      providerCost: providerCostRaw,
      currency: currencyRaw,
      billingCycle: billingCycleRaw,
    } = req.body;

    if (!clientId || !label) {
      return res.status(400).json({ error: "Client ID and server label are required" });
    }

    const status = (statusBody && String(statusBody).toUpperCase()) || "PENDING";
    const currency = CURRENCIES.includes(String(currencyRaw).toUpperCase())
      ? String(currencyRaw).toUpperCase()
      : "EUR";
    const billingCycle = BILLING_CYCLES.includes(String(billingCycleRaw).toUpperCase())
      ? String(billingCycleRaw).toUpperCase()
      : "YEARLY";
    let activationDate: Date | null = activationDateRaw ? new Date(activationDateRaw) : null;
    let expirationDate: Date | null = expirationDateRaw ? new Date(expirationDateRaw) : null;
    const lifespanYearsNum = lifespanYears != null ? Number(lifespanYears) : null;

    if (status === "ACTIVE" && !activationDate) {
      activationDate = new Date();
    }
    if (activationDate && lifespanYearsNum != null && lifespanYearsNum > 0 && !expirationDate) {
      expirationDate = addYears(activationDate, lifespanYearsNum);
    }

    const server = await prisma.server.create({
      data: {
        clientId: Number(clientId),
        label,
        provider: provider || null,
        ipAddress: ipAddress || null,
        plan: plan || null,
        location: location || null,
        notes: notes || null,
        activationDate,
        expirationDate,
        lifespanYears: lifespanYearsNum,
        price: parseMoney(priceRaw),
        providerCost: parseMoney(providerCostRaw),
        currency,
        billingCycle,
        status,
        isActive: status === "ACTIVE" || status === "RENEWED" || status === "RENEWAL_DUE",
      },
      include: { client: { select: clientSelect } },
    });

    res.status(201).json(server);
  } catch (error) {
    console.error("Error creating server:", error);
    res.status(500).json({ error: "Failed to create server" });
  }
});

// update server
router.put("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      provider,
      ipAddress,
      plan,
      location,
      isActive,
      notes,
      activationDate: activationDateRaw,
      expirationDate: expirationDateRaw,
      lifespanYears,
      status: statusBody,
      price: priceRaw,
      providerCost: providerCostRaw,
      currency: currencyRaw,
      billingCycle: billingCycleRaw,
    } = req.body;

    const existing = await prisma.server.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Server not found" });
    }

    const status = statusBody !== undefined ? String(statusBody).toUpperCase() : existing.status;
    const currency =
      currencyRaw !== undefined
        ? (CURRENCIES.includes(String(currencyRaw).toUpperCase()) ? String(currencyRaw).toUpperCase() : existing.currency)
        : existing.currency;
    const billingCycle =
      billingCycleRaw !== undefined
        ? (BILLING_CYCLES.includes(String(billingCycleRaw).toUpperCase()) ? String(billingCycleRaw).toUpperCase() : existing.billingCycle)
        : existing.billingCycle;
    let activationDate: Date | null =
      activationDateRaw !== undefined ? (activationDateRaw ? new Date(activationDateRaw) : null) : existing.activationDate;
    let expirationDate: Date | null =
      expirationDateRaw !== undefined ? (expirationDateRaw ? new Date(expirationDateRaw) : null) : existing.expirationDate;
    const lifespanYearsNum =
      lifespanYears !== undefined ? (lifespanYears == null ? null : Number(lifespanYears)) : existing.lifespanYears;

    if (status === "ACTIVE" && !activationDate) {
      activationDate = new Date();
    }
    if (
      activationDate &&
      lifespanYearsNum != null &&
      lifespanYearsNum > 0 &&
      expirationDateRaw === undefined &&
      existing.expirationDate === null
    ) {
      expirationDate = addYears(activationDate, lifespanYearsNum);
    }

    const previousExpiration = existing.expirationDate ? existing.expirationDate.getTime() : null;
    const newExpiration = expirationDate ? expirationDate.getTime() : null;
    const isRenewal = newExpiration != null && previousExpiration != null && newExpiration > previousExpiration;

    const server = await prisma.server.update({
      where: { id: Number(id) },
      data: {
        label: label !== undefined ? label : existing.label,
        provider: provider !== undefined ? (provider || null) : existing.provider,
        ipAddress: ipAddress !== undefined ? (ipAddress || null) : existing.ipAddress,
        plan: plan !== undefined ? (plan || null) : existing.plan,
        location: location !== undefined ? (location || null) : existing.location,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        notes: notes !== undefined ? notes : existing.notes,
        activationDate,
        expirationDate,
        lifespanYears: lifespanYearsNum,
        price: priceRaw !== undefined ? parseMoney(priceRaw) : existing.price,
        providerCost: providerCostRaw !== undefined ? parseMoney(providerCostRaw) : existing.providerCost,
        currency,
        billingCycle,
        status,
        ...(isRenewal ? { renewalReminderSentAt: null } : {}),
      },
      include: { client: { select: clientSelect } },
    });

    res.json(server);
  } catch (error) {
    console.error("Error updating server:", error);
    res.status(500).json({ error: "Failed to update server" });
  }
});

// delete server
router.delete("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const serverId = Number(req.params.id);
    if (!Number.isInteger(serverId)) {
      return res.status(400).json({ error: "Invalid server ID" });
    }

    await prisma.server.delete({ where: { id: serverId } });
    res.json({ success: true, message: "Server deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Server not found" });
    }
    console.error("Error deleting server:", error);
    res.status(500).json({ error: "Failed to delete server" });
  }
});

export default router;
