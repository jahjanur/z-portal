import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import {
  sendDomainActivationEmail,
  sendDomainRenewalConfirmationEmail,
} from "../services/notifications";

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

// get all domains for a client (admin: any client; CLIENT: only own)
router.get("/client/:clientId", verifyJWT, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const authUserId = req.user?.userId;
    const role = req.user?.role;

    // Admin can access any client's domains; CLIENT can only access their own
    if (role === "CLIENT") {
      if (Number(clientId) !== authUserId) {
        return res.status(403).json({ error: "Not authorized to view these domains" });
      }
    } else if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can view other clients' domains" });
    }

    const domains = await prisma.domain.findMany({
      where: { clientId: Number(clientId) },
      include: {
        client: {
          select: clientSelect,
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json(domains);
  } catch (error) {
    console.error("Error fetching domains:", error);
    res.status(500).json({ error: "Failed to fetch domains" });
  }
});

// get one domain (admin only)
router.get("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: {
          select: clientSelect,
        }
      }
    });
    
    if (!domain) {
      return res.status(404).json({ error: "Domain not found" });
    }
    
    res.json(domain);
  } catch (error) {
    console.error("Error fetching domain:", error);
    res.status(500).json({ error: "Failed to fetch domain" });
  }
});

// post create new domain
router.post("/", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const {
      clientId,
      domainName,
      isPrimary,
      notes,
      activationDate: activationDateRaw,
      expirationDate: expirationDateRaw,
      lifespanYears,
      status: statusBody,
    } = req.body;

    if (!clientId || !domainName) {
      return res.status(400).json({ error: "Client ID and domain name are required" });
    }

    const status = (statusBody && String(statusBody).toUpperCase()) || "PENDING";
    let activationDate: Date | null = activationDateRaw ? new Date(activationDateRaw) : null;
    let expirationDate: Date | null = expirationDateRaw ? new Date(expirationDateRaw) : null;
    const lifespanYearsNum = lifespanYears != null ? Number(lifespanYears) : null;

    if (status === "ACTIVE" && !activationDate) {
      activationDate = new Date();
    }
    if (activationDate && lifespanYearsNum != null && lifespanYearsNum > 0 && !expirationDate) {
      expirationDate = addYears(activationDate, lifespanYearsNum);
    }

    if (isPrimary) {
      await prisma.domain.updateMany({
        where: { clientId: Number(clientId), isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const domain = await prisma.domain.create({
      data: {
        clientId: Number(clientId),
        domainName,
        isPrimary: isPrimary || false,
        notes: notes || null,
        activationDate,
        expirationDate,
        lifespanYears: lifespanYearsNum,
        status,
        isActive: status === "ACTIVE" || status === "RENEWED" || status === "RENEWAL_DUE",
      },
      include: {
        client: { select: clientSelect },
      },
    });

    if (status === "ACTIVE" && domain.client && "email" in domain.client) {
      try {
        await sendDomainActivationEmail(domain, {
          email: (domain.client as { email: string }).email,
          name: domain.client.name,
        });
        await prisma.domain.update({
          where: { id: domain.id },
          data: { activationEmailSentAt: new Date() },
        });
      } catch (emailErr) {
        console.error("Failed to send domain activation email:", emailErr);
      }
    }

    const updated = await prisma.domain.findUnique({
      where: { id: domain.id },
      include: { client: { select: clientSelect } },
    });
    res.status(201).json(updated);
  } catch (error) {
    console.error("Error creating domain:", error);
    res.status(500).json({ error: "Failed to create domain" });
  }
});

// put update domain
router.put("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      domainName,
      isPrimary,
      isActive,
      notes,
      activationDate: activationDateRaw,
      expirationDate: expirationDateRaw,
      lifespanYears,
      status: statusBody,
    } = req.body;

    const existingDomain = await prisma.domain.findUnique({
      where: { id: Number(id) },
      include: { client: { select: clientSelect } },
    });

    if (!existingDomain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    const status = statusBody !== undefined ? String(statusBody).toUpperCase() : existingDomain.status;
    let activationDate: Date | null =
      activationDateRaw !== undefined ? new Date(activationDateRaw) : existingDomain.activationDate;
    let expirationDate: Date | null =
      expirationDateRaw !== undefined ? new Date(expirationDateRaw) : existingDomain.expirationDate;
    const lifespanYearsNum =
      lifespanYears !== undefined ? (lifespanYears == null ? null : Number(lifespanYears)) : existingDomain.lifespanYears;

    const isFirstTimeActivation =
      status === "ACTIVE" && !existingDomain.activationEmailSentAt && existingDomain.status !== "ACTIVE";
    if (isFirstTimeActivation && !activationDate) {
      activationDate = new Date();
    }
    if (
      isFirstTimeActivation &&
      activationDate &&
      lifespanYearsNum != null &&
      lifespanYearsNum > 0 &&
      !expirationDate
    ) {
      expirationDate = addYears(activationDate, lifespanYearsNum);
    }
    if (
      !isFirstTimeActivation &&
      activationDate &&
      lifespanYearsNum != null &&
      lifespanYearsNum > 0 &&
      expirationDateRaw === undefined &&
      existingDomain.expirationDate === null
    ) {
      expirationDate = addYears(activationDate, lifespanYearsNum);
    }

    const previousExpiration = existingDomain.expirationDate
      ? existingDomain.expirationDate.getTime()
      : null;
    const newExpiration = expirationDate ? expirationDate.getTime() : null;
    const isRenewal = newExpiration != null && previousExpiration != null && newExpiration > previousExpiration;

    const updateData: {
      domainName?: string;
      isPrimary?: boolean;
      isActive?: boolean;
      notes?: string | null;
      activationDate?: Date | null;
      expirationDate?: Date | null;
      lifespanYears?: number | null;
      status?: string;
      activationEmailSentAt?: Date | null;
      renewalReminderSentAt?: Date | null;
    } = {
      domainName: domainName !== undefined ? domainName : existingDomain.domainName,
      isPrimary: isPrimary !== undefined ? isPrimary : existingDomain.isPrimary,
      isActive: isActive !== undefined ? isActive : existingDomain.isActive,
      notes: notes !== undefined ? notes : existingDomain.notes,
      activationDate,
      expirationDate,
      lifespanYears: lifespanYearsNum,
      status,
    };

    if (isRenewal) {
      updateData.renewalReminderSentAt = null;
    }

    const domain = await prisma.domain.update({
      where: { id: Number(id) },
      data: updateData,
      include: { client: { select: clientSelect } },
    });

    if (isFirstTimeActivation && domain.client && "email" in domain.client) {
      try {
        await sendDomainActivationEmail(domain, {
          email: (domain.client as { email: string }).email,
          name: domain.client.name,
        });
        await prisma.domain.update({
          where: { id: domain.id },
          data: { activationEmailSentAt: new Date() },
        });
      } catch (emailErr) {
        console.error("Failed to send domain activation email:", emailErr);
      }
    } else if (isRenewal && domain.client && "email" in domain.client) {
      try {
        await sendDomainRenewalConfirmationEmail(domain, {
          email: (domain.client as { email: string }).email,
          name: domain.client.name,
        });
      } catch (emailErr) {
        console.error("Failed to send domain renewal confirmation:", emailErr);
      }
    }

    const updated = await prisma.domain.findUnique({
      where: { id: Number(id) },
      include: { client: { select: clientSelect } },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating domain:", error);
    res.status(500).json({ error: "Failed to update domain" });
  }
});

// delete domain
router.delete("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const domainId = Number(req.params.id);
    if (!Number.isInteger(domainId)) {
      return res.status(400).json({ error: "Invalid domain ID" });
    }

    await prisma.domain.delete({
      where: { id: domainId }
    });

    res.json({ success: true, message: "Domain deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Domain not found" });
    }
    console.error("Error deleting domain:", error);
    res.status(500).json({ error: "Failed to delete domain" });
  }
});

// post set domain as primary
router.post("/:id/set-primary", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const domain = await prisma.domain.findUnique({
      where: { id: Number(id) }
    });

    if (!domain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    await prisma.domain.updateMany({
      where: { 
        clientId: domain.clientId,
        isPrimary: true 
      },
      data: { isPrimary: false }
    });

    const updatedDomain = await prisma.domain.update({
      where: { id: Number(id) },
      data: { isPrimary: true }
    });

    res.json(updatedDomain);
  } catch (error) {
    console.error("Error setting primary domain:", error);
    res.status(500).json({ error: "Failed to set primary domain" });
  }
});

export default router;