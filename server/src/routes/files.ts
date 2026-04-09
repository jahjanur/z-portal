import { Router } from "express";
import path from "path";
import fs from "fs";
import { verifyJWT } from "../middleware/auth";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";

const router = Router();

// GET /uploads/:filename — protected file download
// Access rules:
//   ADMIN     → always allowed
//   CLIENT    → must own the task the file belongs to
//   WORKER    → must be assigned to the task the file belongs to
//   ERASPHERE → client who owns the task must be referred by them
router.get("/:filename", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    const { filename } = req.params;

    // Prevent path traversal
    const safeName = path.basename(filename);
    const fileUrl = `/uploads/${safeName}`;

    // Look up file record
    const taskFile = await prisma.taskFile.findFirst({
      where: { fileUrl },
      include: {
        task: {
          include: {
            workers: { select: { userId: true } },
          },
        },
      },
    });

    if (!taskFile) {
      return res.status(404).json({ error: "File not found" });
    }

    const task = taskFile.task;
    let authorized = false;

    if (role === "ADMIN") {
      authorized = true;
    } else if (role === "CLIENT") {
      authorized = task.clientId === userId;
    } else if (role === "WORKER") {
      authorized = task.workers.some((w) => w.userId === userId);
    } else if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      authorized = task.clientId !== null && referredClientIds.includes(task.clientId);
    }

    if (!authorized) {
      return res.status(403).json({ error: "Not authorized to access this file" });
    }

    const filePath = path.join(uploadsDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
