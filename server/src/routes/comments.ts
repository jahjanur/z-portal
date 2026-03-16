import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

/** Admin only: recent comments (task + file). Use threadFilter: "internal" (admin–worker) | "client" (admin–client). */
router.get("/recent", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const threadFilter = (req.query.threadFilter as string)?.toLowerCase(); // "internal" | "client"
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const [taskComments, fileComments] = await Promise.all([
      prisma.taskComment.findMany({
        take: limit * 2,
        orderBy: { createdAt: "desc" },
        where:
          threadFilter === "internal"
            ? { visibleToClient: false }
            : threadFilter === "client"
              ? { visibleToClient: true }
              : undefined,
        include: {
          user: { select: { id: true, name: true, role: true, email: true } },
          task: { select: { id: true, title: true, clientId: true } },
        },
      }),
      prisma.fileComment.findMany({
        take: limit * 2,
        orderBy: { createdAt: "desc" },
        where:
          threadFilter === "internal"
            ? { visibleToClient: false }
            : threadFilter === "client"
              ? { visibleToClient: true }
              : undefined,
        include: {
          user: { select: { id: true, name: true, role: true, email: true } },
          file: {
            select: {
              id: true,
              fileName: true,
              taskId: true,
              task: { select: { id: true, title: true, clientId: true } },
            },
          },
        },
      }),
    ]);

    type UnifiedComment = {
      id: string;
      type: "task" | "file";
      taskId: number;
      taskTitle: string;
      authorName: string;
      authorRole: string;
      content: string;
      createdAt: string;
      visibleToClient: boolean;
      fileId?: number;
      fileName?: string;
    };

    const mapTask = (c: (typeof taskComments)[0]): UnifiedComment => ({
      id: `task-${c.id}`,
      type: "task",
      taskId: c.task.id,
      taskTitle: c.task.title,
      authorName: c.user.name,
      authorRole: c.user.role,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      visibleToClient: c.visibleToClient,
    });

    const mapFile = (c: (typeof fileComments)[0]): UnifiedComment => ({
      id: `file-${c.id}`,
      type: "file",
      taskId: c.file.task.id,
      taskTitle: c.file.task.title,
      authorName: c.user.name,
      authorRole: c.user.role,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      visibleToClient: c.visibleToClient,
      fileId: c.file.id,
      fileName: c.file.fileName,
    });

    let list: UnifiedComment[] = [
      ...taskComments.map(mapTask),
      ...fileComments.map(mapFile),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    list = list.slice(0, limit);
    return res.json({ comments: list });
  } catch (error) {
    console.error("Error fetching recent comments:", error);
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

export default router;
