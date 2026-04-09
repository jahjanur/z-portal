import express from 'express';
import prisma from "../lib/prisma";
import { verifyJWT, verifyAdminOrEraSphere } from "../middleware/auth";

const router = express.Router();

// GET /api/projects - Get all projects (for tasks)
router.get("/", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { role, userId } = req.user;

    let clientFilter: { clientId?: { in: number[] } } = {};
    if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      clientFilter = { clientId: { in: referredClientIds } };
    }

    const projects = await prisma.project.findMany({
      where: clientFilter,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// POST /api/projects - Create new project
router.post("/", verifyJWT, verifyAdminOrEraSphere, async (req, res) => {
  try {
    const { name, description, clientId, startDate, endDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        clientId: clientId ? Number(clientId) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PATCH /api/projects/:id - Update project
router.patch("/:id", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;
    const { name, description, status, clientId, startDate, endDate } = req.body;

    if (role === "ERASPHERE") {
      const existing = await prisma.project.findUnique({ where: { id: Number(id) }, select: { clientId: true } });
      if (!existing) return res.status(404).json({ error: "Project not found" });
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (existing.clientId === null || !referredClientIds.includes(existing.clientId)) {
        return res.status(403).json({ error: "Not authorized to update this project" });
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (clientId !== undefined) updateData.clientId = clientId ? Number(clientId) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete("/:id", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    // Check if project has tasks
    const project = await prisma.project.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { tasks: true } } },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (project.clientId === null || !referredClientIds.includes(project.clientId)) {
        return res.status(403).json({ error: "Not authorized to delete this project" });
      }
    }

    // Delete project (tasks will become standalone due to onDelete: SetNull)
    await prisma.project.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// PATCH /api/projects/:id/status - Update project status
router.patch("/:id/status", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;
    const { status } = req.body;

    if (role === "ERASPHERE") {
      const existing = await prisma.project.findUnique({ where: { id: Number(id) }, select: { clientId: true } });
      if (!existing) return res.status(404).json({ error: "Project not found" });
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (existing.clientId === null || !referredClientIds.includes(existing.clientId)) {
        return res.status(403).json({ error: "Not authorized to update this project" });
      }
    }

    const validStatuses = ["ACTIVE", "COMPLETED", "ARCHIVED"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
      });
    }

    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(project);
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ error: "Failed to update project status" });
  }
});

export default router;