import { Router } from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

interface AuthUser {
  userId: number;
  role: string;
}

/**
 * Verify a JWT from the Authorization header OR a `?token=` query param.
 * Browsers cannot set headers on <img>/<a> file requests, so the client passes
 * the token as a same-origin query param (see client getFileUrl).
 * Returns 401 when no token is present, 403 when a token is present but invalid.
 */
function authFromReq(req: any): { ok: true; user: AuthUser } | { ok: false; status: number } {
  const header: string | undefined = req.headers.authorization;
  const headerToken = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const token = headerToken || queryToken;
  if (!token) return { ok: false, status: 401 };
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const role = typeof decoded?.role === "string" ? decoded.role.toUpperCase() : decoded?.role;
    return { ok: true, user: { userId: decoded.userId, role } };
  } catch {
    return { ok: false, status: 403 };
  }
}

async function referredClientIds(userId: number): Promise<number[]> {
  const rows = await prisma.user.findMany({
    where: { role: "CLIENT", referredById: userId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// GET /uploads/** — protected file download.
// Handles task files (/uploads/<name>), invoice PDFs (/uploads/invoices/<name>),
// profile files (/uploads/profile-files/<clientId>/<name>) and branding logos.
// Access rules (default-deny):
//   ADMIN     → always allowed
//   CLIENT    → owns the related task/invoice/profile, or owns the asset
//   WORKER    → assigned to a task tied to the resource
//   ERASPHERE → resource's client is referred by them
router.get(/.*/, async (req: any, res) => {
  try {
    const auth = authFromReq(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" });
    const { role, userId } = auth.user;

    // Normalise the requested subpath and resolve it safely inside uploadsDir.
    const rel = decodeURIComponent(req.path).replace(/^\/+/, "");
    const absPath = path.resolve(uploadsDir, rel);
    const root = path.resolve(uploadsDir);
    if (absPath !== root && !absPath.startsWith(root + path.sep)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    const fileUrl = `/uploads/${rel}`;
    let authorized = false;

    if (role === "ADMIN") {
      authorized = true;
    } else if (rel.startsWith("invoices/")) {
      const invoice = await prisma.invoice.findFirst({ where: { fileUrl }, select: { clientId: true } });
      if (invoice) {
        if (role === "CLIENT") authorized = invoice.clientId === userId;
        else if (role === "ERASPHERE") authorized = (await referredClientIds(userId)).includes(invoice.clientId);
        else if (role === "WORKER") {
          const t = await prisma.task.findFirst({
            where: { clientId: invoice.clientId, workers: { some: { userId } } },
            select: { id: true },
          });
          authorized = !!t;
        }
      }
    } else if (rel.startsWith("project-assets/")) {
      // Project assets (brand colors, design files) — staff + assigned workers.
      authorized = role === "ERASPHERE" || role === "WORKER"; // ADMIN already authorized above
    } else if (rel.startsWith("profile-files/")) {
      const ownerId = Number(rel.split("/")[1]);
      if (role === "CLIENT") authorized = ownerId === userId;
      else if (role === "ERASPHERE") authorized = (await referredClientIds(userId)).includes(ownerId);
      else if (role === "WORKER") {
        // A worker may see a client's brand files only for a client they're assigned to.
        const t = await prisma.task.findFirst({ where: { clientId: ownerId, workers: { some: { userId } } }, select: { id: true } });
        authorized = !!t;
      }
    } else {
      // Task file (/uploads/<name>) or a branding logo (/uploads/files/<name>).
      const taskFile = await prisma.taskFile.findFirst({
        where: { fileUrl },
        include: { task: { include: { workers: { select: { userId: true } } } } },
      });
      if (taskFile) {
        const task = taskFile.task;
        if (role === "CLIENT") authorized = task.clientId === userId;
        else if (role === "WORKER") authorized = task.workers.some((w) => w.userId === userId);
        else if (role === "ERASPHERE")
          authorized = task.clientId !== null && (await referredClientIds(userId)).includes(task.clientId);
      } else {
        // Branding asset (logo): the owning client, or a worker assigned to that
        // client's task. Admins already allowed above.
        const owner = await prisma.user.findFirst({ where: { logo: fileUrl }, select: { id: true } });
        if (owner) {
          if (role === "WORKER") {
            const t = await prisma.task.findFirst({ where: { clientId: owner.id, workers: { some: { userId } } }, select: { id: true } });
            authorized = !!t;
          } else {
            authorized = owner.id === userId;
          }
        }
      }
    }

    if (!authorized) return res.status(403).json({ error: "Not authorized to access this file" });

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(absPath);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
