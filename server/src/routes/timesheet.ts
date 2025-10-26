import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// get all projects
router.get("/projects", async (req, res) => {
  try {
    const projects = await prisma.timesheetProject.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        entries: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const projectsWithTotals = projects.map((project) => {
      const totalHours = project.entries.reduce((sum, e) => sum + e.hoursWorked, 0);
      const totalPay = project.entries.reduce((sum, e) => sum + e.totalPay, 0);
      const dateRange = project.entries.length > 0 
        ? {
            startDate: project.entries[0].date,
            endDate: project.entries[project.entries.length - 1].date,
          }
        : null;

      return {
        ...project,
        totalHours,
        totalPay,
        dateRange,
      };
    });

    res.status(200).json(projectsWithTotals);
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    res.status(500).json({
      message: "Failed to fetch projects",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// get single project
router.get("/projects/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await prisma.timesheetProject.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        entries: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const totalHours = project.entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const totalPay = project.entries.reduce((sum, e) => sum + e.totalPay, 0);
    const dateRange = project.entries.length > 0 
      ? {
          startDate: project.entries[0].date,
          endDate: project.entries[project.entries.length - 1].date,
        }
      : null;

    res.status(200).json({
      ...project,
      totalHours,
      totalPay,
      dateRange,
    });
  } catch (error) {
    console.error("❌ Error fetching project:", error);
    res.status(500).json({
      message: "Failed to fetch project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// create project
router.post("/projects", async (req, res) => {
  try {
    const { projectName, clientId, description } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await prisma.timesheetProject.create({
      data: {
        projectName,
        clientId: clientId ? parseInt(clientId) : null,
        description: description || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        entries: true,
      },
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res.status(500).json({
      message: "Failed to create project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// create project entry
router.post("/projects/:id/entries", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { date, hoursWorked, hourlyRate, notes } = req.body;

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    if (!date || hoursWorked === undefined || hourlyRate === undefined) {
      return res.status(400).json({
        message: "Date, hours worked, and hourly rate are required",
      });
    }

    if (hoursWorked <= 0) {
      return res.status(400).json({
        message: "Hours worked must be greater than 0",
      });
    }

    if (hourlyRate <= 0) {
      return res.status(400).json({
        message: "Hourly rate must be greater than 0",
      });
    }

    const project = await prisma.timesheetProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const totalPay = parseFloat(hoursWorked) * parseFloat(hourlyRate);

    const entry = await prisma.timesheetEntry.create({
      data: {
        projectId,
        date: new Date(date),
        hoursWorked: parseFloat(hoursWorked),
        hourlyRate: parseFloat(hourlyRate),
        totalPay,
        notes: notes || null,
      },
    });

    res.status(201).json({
      message: "Entry added successfully",
      entry,
    });
  } catch (error) {
    console.error("❌ Error adding entry:", error);
    res.status(500).json({
      message: "Failed to add entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// update entry
router.patch("/entries/:id", async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const { date, hoursWorked, hourlyRate, notes } = req.body;

    if (isNaN(entryId)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }

    const existingEntry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const updateData: {
      date?: Date;
      hoursWorked?: number;
      hourlyRate?: number;
      totalPay?: number;
      notes?: string | null;
    } = {};

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    if (hoursWorked !== undefined) {
      if (hoursWorked <= 0) {
        return res.status(400).json({
          message: "Hours worked must be greater than 0",
        });
      }
      updateData.hoursWorked = parseFloat(hoursWorked);
    }

    if (hourlyRate !== undefined) {
      if (hourlyRate <= 0) {
        return res.status(400).json({
          message: "Hourly rate must be greater than 0",
        });
      }
      updateData.hourlyRate = parseFloat(hourlyRate);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const finalHours = updateData.hoursWorked ?? existingEntry.hoursWorked;
    const finalRate = updateData.hourlyRate ?? existingEntry.hourlyRate;
    updateData.totalPay = finalHours * finalRate;

    const entry = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    res.status(200).json({
      message: "Entry updated successfully",
      entry,
    });
  } catch (error) {
    console.error("❌ Error updating entry:", error);
    res.status(500).json({
      message: "Failed to update entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// delete entry
router.delete("/entries/:id", async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);

    if (isNaN(entryId)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }

    const entry = await prisma.timesheetEntry.delete({
      where: { id: entryId },
    });

    res.status(200).json({
      message: "Entry deleted successfully",
      entry,
    });
  } catch (error) {
    console.error("❌ Error deleting entry:", error);
    res.status(500).json({
      message: "Failed to delete entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// delete project and all entries
router.delete("/projects/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await prisma.timesheetProject.delete({
      where: { id: projectId },
      include: {
        entries: true,
      },
    });

    res.status(200).json({
      message: "Project deleted successfully",
      project,
    });
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    res.status(500).json({
      message: "Failed to delete project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// update project paid status
router.patch("/projects/:id/mark-paid", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await prisma.timesheetProject.update({
      where: { id: projectId },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        entries: {
          orderBy: { date: "asc" },
        },
      },
    });

    res.status(200).json({
      message: "Project marked as paid",
      project,
    });
  } catch (error) {
    console.error("❌ Error marking project as paid:", error);
    res.status(500).json({
      message: "Failed to mark project as paid",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// update project unpaid status
router.patch("/projects/:id/mark-unpaid", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await prisma.timesheetProject.update({
      where: { id: projectId },
      data: {
        isPaid: false,
        paidAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        entries: {
          orderBy: { date: "asc" },
        },
      },
    });

    res.status(200).json({
      message: "Project marked as unpaid",
      project,
    });
  } catch (error) {
    console.error("❌ Error marking project as unpaid:", error);
    res.status(500).json({
      message: "Failed to mark project as unpaid",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;