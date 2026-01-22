import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT, verifyAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// get all domains
router.get("/client/:clientId", verifyJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const domains = await prisma.domain.findMany({
      where: { clientId: Number(clientId) },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          }
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

// get one domain
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          }
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
      notes
    } = req.body;

    if (!clientId || !domainName) {
      return res.status(400).json({ error: "Client ID and domain name are required" });
    }

    if (isPrimary) {
      await prisma.domain.updateMany({
        where: { 
          clientId: Number(clientId),
          isPrimary: true 
        },
        data: { isPrimary: false }
      });
    }

    const domain = await prisma.domain.create({
      data: {
        clientId: Number(clientId),
        domainName,
        isPrimary: isPrimary || false,
        notes: notes || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          }
        }
      }
    });

    res.status(201).json(domain);
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
      notes
    } = req.body;

    const existingDomain = await prisma.domain.findUnique({
      where: { id: Number(id) }
    });

    if (!existingDomain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    if (isPrimary && !existingDomain.isPrimary) {
      await prisma.domain.updateMany({
        where: { 
          clientId: existingDomain.clientId,
          isPrimary: true,
          id: { not: Number(id) }
        },
        data: { isPrimary: false }
      });
    }

    const domain = await prisma.domain.update({
      where: { id: Number(id) },
      data: {
        domainName: domainName !== undefined ? domainName : existingDomain.domainName,
        isPrimary: isPrimary !== undefined ? isPrimary : existingDomain.isPrimary,
        isActive: isActive !== undefined ? isActive : existingDomain.isActive,
        notes: notes !== undefined ? notes : existingDomain.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          }
        }
      }
    });

    res.json(domain);
  } catch (error) {
    console.error("Error updating domain:", error);
    res.status(500).json({ error: "Failed to update domain" });
  }
});

// delete domain
router.delete("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    await prisma.domain.delete({
      where: { id: Number(req.params.id) }
    });
    
    res.json({ success: true, message: "Domain deleted successfully" });
  } catch (error) {
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