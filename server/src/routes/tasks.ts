import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import multer from "multer";
import path from "path";
import { emit, EventType } from "../services/notificationEngine";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";
import { maskTaskWorkers, workerAlias } from "../lib/workerIdentity";
import { sendMilestoneDoneEmail } from "../services/milestoneEmail";
import { clientScopeId } from "../lib/clientScope";

type ReqUser = { userId: number; role: string; companyOwnerId?: number | null };

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/** Client ids referred by an EraSphere partner. Used to scope a partner's
 *  access to only the tasks/clients they brought in. */
async function getReferredClientIds(userId: number): Promise<number[]> {
  const rows = await prisma.user.findMany({
    where: { role: "CLIENT", referredById: userId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// get all tasks
router.get("/", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    let tasks;

    // Optional ?clientId= filter (used by the admin/EraSphere client detail page).
    const clientIdQ = Number(req.query.clientId);
    const filterClientId = Number.isInteger(clientIdQ) ? clientIdQ : null;

    const workersInclude = {
          workers: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  nickname: true,
                  avatarEmoji: true,
                  skills: true,
                  role: true
                }
              }
            }
          },
          // compact milestone stats for progress bars on task cards
          milestones: { select: { id: true, isDone: true } }
        };
    if (role === "ADMIN") {
      tasks = await prisma.task.findMany({
        where: filterClientId !== null ? { clientId: filterClientId } : undefined,
        include: {
          client: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              role: true,
              referredById: true,
            }
          },
          ...workersInclude,
          project: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          files: true,
          comments: true
        }
      });
    } else if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user.findMany({
        where: { role: "CLIENT", referredById: userId },
        select: { id: true },
      }).then((rows) => rows.map((r) => r.id));
      // If a clientId filter is given, only honor it when that client is referred by this partner.
      const scopedIds =
        filterClientId !== null
          ? referredClientIds.filter((cid) => cid === filterClientId)
          : referredClientIds;
      tasks = await prisma.task.findMany({
        where: { clientId: { in: scopedIds } },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              role: true
            }
          },
          ...workersInclude,
          project: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          files: true,
          comments: true
        }
      });
    } else if (role === "WORKER") {
      tasks = await prisma.task.findMany({ 
        where: { workers: { some: { userId } } }, 
        include: { 
          client: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              role: true
            }
          },
          ...workersInclude,
          project: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          files: true,
          comments: true
        } 
      });
    } else if (role === "CLIENT") {
      tasks = await prisma.task.findMany({
        where: { clientId: clientScopeId(req.user) },
        include: { 
          ...workersInclude,
          project: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          files: true,
          comments: true
        } 
      });
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    // Channel visibility for list payloads — mirror GET /tasks/:id so internal
    // (worker-channel) files/comments never leak into a client's response, and
    // client-channel content isn't exposed to workers. ADMIN sees everything.
    if (role === "CLIENT" || role === "ERASPHERE") {
      tasks = (tasks as any[]).map((t: any) =>
        maskTaskWorkers({
          ...t,
          comments: (t.comments ?? []).filter((c: { visibleToClient: boolean }) => c.visibleToClient),
          files: (t.files ?? []).filter((f: { visibleToClient: boolean }) => f.visibleToClient),
        })
      );
    } else if (role === "WORKER") {
      tasks = (tasks as any[]).map((t: any) => ({
        ...t,
        comments: (t.comments ?? []).filter((c: { visibleToClient: boolean }) => !c.visibleToClient),
        files: (t.files ?? []).filter((f: { visibleToClient: boolean }) => !f.visibleToClient),
      }));
    }

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// get task id
router.get("/:id", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    const taskId = Number(req.params.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            role: true,
            referredById: true,
            logo: true,
            colorHex: true,
            brandPattern: true,
            shortInfo: true,
          }
        },
        workers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            serviceType: true,
            metadata: true
          }
        },
        files: {
          orderBy: { uploadedAt: "desc" },
          include: {
            comments: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    avatarEmoji: true,
                    email: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                avatarEmoji: true,
                email: true,
                role: true
              }
            }
          }
        },
        milestones: { orderBy: [{ order: "asc" }, { id: "asc" }] }
      }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isAssignedWorker = task.workers.some((tw) => tw.userId === userId);
    if (role === "WORKER" && !isAssignedWorker) {
      return res.status(403).json({ error: "Not authorized to view this task" });
    }
    if (role === "CLIENT" && task.clientId !== clientScopeId(req.user)) {
      return res.status(403).json({ error: "Not authorized to view this task" });
    }
    if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      if (task.clientId === null || !referredClientIds.includes(task.clientId)) {
        return res.status(403).json({ error: "Not authorized to view this task" });
      }
    }

    // Resolve uploader name + role for every file (uploadedBy is a raw Int with no DB relation)
    const uploaderIds = [...new Set((task as any).files.map((f: { uploadedBy: number }) => f.uploadedBy).filter(Boolean))];
    const uploaders = uploaderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds as number[] } },
          select: { id: true, name: true, nickname: true, avatarEmoji: true, role: true },
        })
      : [];
    const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));
    (task as any).files = (task as any).files.map((f: any) => ({
      ...f,
      uploader: uploaderMap[f.uploadedBy] ?? null,
    }));

    // Channel visibility per role:
    //   CLIENT    → only client-channel content (visibleToClient: true)
    //   ERASPHERE → same as CLIENT
    //   WORKER    → only worker-channel content (visibleToClient: false)
    //   ADMIN     → all content, no filter
    if (role === "CLIENT" || role === "ERASPHERE") {
      (task as any).comments = (task as any).comments.filter((c: { visibleToClient: boolean }) => c.visibleToClient);
      (task as any).files = (task as any).files.filter((f: { visibleToClient: boolean }) => f.visibleToClient);
      (task as any).files = (task as any).files.map((f: { comments: { visibleToClient: boolean }[] }) => ({
        ...f,
        comments: f.comments.filter((c: { visibleToClient: boolean }) => c.visibleToClient),
      }));
      // Privacy: external viewers see worker codenames + emoji, never real names/emails.
      maskTaskWorkers(task);
    } else if (role === "WORKER") {
      (task as any).comments = (task as any).comments.filter((c: { visibleToClient: boolean }) => !c.visibleToClient);
      (task as any).files = (task as any).files.filter((f: { visibleToClient: boolean }) => !f.visibleToClient);
      (task as any).files = (task as any).files.map((f: { comments: { visibleToClient: boolean }[] }) => ({
        ...f,
        comments: f.comments.filter((c: { visibleToClient: boolean }) => !c.visibleToClient),
      }));
    }

    // Privacy: a project's metadata may hold access credentials (logins) —
    // only ADMIN may see those. Strip them for workers/clients/partners.
    if (role !== "ADMIN" && (task as any).project?.metadata && typeof (task as any).project.metadata === "object") {
      const m: Record<string, unknown> = { ...(task as any).project.metadata };
      delete m.credentials;
      (task as any).project.metadata = m;
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// create task
router.post("/", verifyJWT, async (req: any, res) => {
  try {
    const { role } = req.user;
    if (role !== "ADMIN" && role !== "ERASPHERE") {
      return res.status(403).json({ error: "Only admins or EraSphere can create tasks" });
    }

    const { title, description, clientId, workerIds, status, dueDate, projectId } = req.body;
    const workerIdList = role === "ADMIN" && Array.isArray(workerIds) ? workerIds : [];

    if (!title || !clientId) {
      return res.status(400).json({ error: "Title and clientId are required" });
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId }
    });
    if (!client || client.role !== "CLIENT") {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    for (const wid of workerIdList) {
      const worker = await prisma.user.findUnique({
        where: { id: Number(wid) }
      });
      if (!worker || worker.role !== "WORKER") {
        return res.status(400).json({ error: `Invalid worker ID: ${wid}` });
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      if (!project) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
    }

    const task = await prisma.task.create({ 
      data: {
        title,
        description: description || null,
        clientId,
        projectId: projectId || null,
        status: status || "PENDING",
        ...(dueDate && { dueDate: new Date(dueDate) }),
        workers: workerIdList.length
          ? { create: workerIdList.map((userId: number) => ({ userId: Number(userId) })) }
          : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            role: true
          }
        },
        workers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    await emit(EventType.TASK_ASSIGNED, {
      title: "New Task Assigned",
      message: `You have been assigned to task: "${task.title}"`,
      link: `/tasks/${task.id}`,
      taskId: task.id,
      actorId: req.user.userId,
    });

    await emit(EventType.TASK_CREATED, {
      title: "New Task Created",
      message: `A new task "${task.title}" has been created`,
      link: `/tasks/${task.id}`,
      taskId: task.id,
      clientId,
      actorId: req.user.userId,
    });

    if (req.user?.role === "ERASPHERE") {
      const partner = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
      const clientName = task.client?.name ?? task.client?.company ?? "client";
      await emit(EventType.ERASPHERE_NEW_TASK, {
        title: "EraSphere added a task",
        message: `${partner?.name ?? "EraSphere partner"} added task "${task.title}" for ${clientName}`,
        link: `/tasks/${task.id}`,
        taskId: task.id,
        actorId: req.user.userId,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// patch task status
router.patch("/:id/status", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    const taskId = Number(req.params.id);
    const { status } = req.body;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { workers: { include: { user: true } } }
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isAssignedWorker = existingTask.workers.some((tw) => tw.userId === userId);
    if (role === "WORKER" && !isAssignedWorker) {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }
    if (role === "CLIENT") {
      return res.status(403).json({ error: "Clients cannot update task status" });
    }
    if (role !== "ADMIN" && role !== "WORKER" && role !== "ERASPHERE") {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }
    if (role === "ERASPHERE") {
      const referredIds = await getReferredClientIds(userId);
      if (existingTask.clientId === null || !referredIds.includes(existingTask.clientId)) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            role: true
          }
        },
        workers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (status && status !== existingTask.status) {
      if (status === "PENDING_APPROVAL") {
        await emit(EventType.TASK_PENDING_APPROVAL, {
          title: "Task Pending Approval",
          message: `Task "${updatedTask.title}" is pending your approval`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      } else if (status === "COMPLETED") {
        await emit(EventType.TASK_COMPLETED, {
          title: "Task Completed",
          message: `Task "${updatedTask.title}" has been marked as completed`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      } else {
        await emit(EventType.TASK_STATUS_CHANGED, {
          title: "Task Status Updated",
          message: `Task "${updatedTask.title}" status changed to ${status}`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

// post files
router.post("/:id/files", verifyJWT, upload.single("file"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { section, caption, fileType, uploadedBy } = req.body;
    const { role, userId } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const taskIdNum = parseInt(id, 10);
    if (isNaN(taskIdNum)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskIdNum },
      include: { workers: { select: { userId: true } } },
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isAssignedWorker = task.workers.some((w) => w.userId === userId);
    let canUpload =
      role === "ADMIN" ||
      (role === "WORKER" && isAssignedWorker) ||
      (role === "CLIENT" && task.clientId === clientScopeId(req.user));
    if (role === "ERASPHERE" && task.clientId) {
      const referredClientIds = await prisma.user
        .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id));
      canUpload = referredClientIds.includes(task.clientId);
    }
    if (!canUpload) {
      return res.status(403).json({ error: "Not authorized to add files to this task" });
    }

    // Auto-versioning: if a prior file with the same base name in this task
    // was NEEDS_REVISION or REJECTED, treat this upload as a new version of it.
    const uploadBaseName = path.parse(req.file.originalname).name.toLowerCase().trim();
    const existingFiles = await prisma.taskFile.findMany({
      where: { taskId: taskIdNum },
      select: { fileName: true, version: true, reviewStatus: true },
    });
    const related = existingFiles.filter((f) => {
      const fBase = path.parse(f.fileName).name.toLowerCase().trim();
      return fBase === uploadBaseName;
    });
    let newVersion = 1;
    if (related.length > 0) {
      const hadReview = related.some(
        (f) => f.reviewStatus === "NEEDS_REVISION" || f.reviewStatus === "REJECTED"
      );
      if (hadReview) {
        newVersion = Math.max(...related.map((f) => f.version)) + 1;
      }
    }

    // Determine channel visibility based on uploader role
    let fileVisibleToClient: boolean;
    if (role === "CLIENT") {
      fileVisibleToClient = true;
    } else if (role === "WORKER") {
      fileVisibleToClient = false;
    } else {
      // ADMIN/ERASPHERE: read from form body, default true (client channel)
      const bodyVal = req.body.visibleToClient;
      fileVisibleToClient = bodyVal === "false" || bodyVal === false ? false : true;
    }

    const file = await prisma.taskFile.create({
      data: {
        taskId: taskIdNum,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: fileType || "document",
        section: section || null,
        caption: caption || null,
        uploadedBy: userId, // use verified JWT identity, not client-supplied body field
        version: newVersion,
        visibleToClient: fileVisibleToClient,
      },
    });

    // Channel-isolated file upload notifications (same routing as comments)
    try {
      const uploader = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const uploaderName = uploader?.name ?? "Someone";
      const threadType = fileVisibleToClient ? "client" : "internal";
      const link = `/tasks/${taskIdNum}`;
      const message = `${uploaderName} uploaded "${req.file.originalname}" to task "${task.title}"`;

      const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      const recipientIds: number[] = [];

      if (fileVisibleToClient) {
        if (role === "CLIENT") {
          // Client uploaded → notify admins
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else {
          // Admin uploaded to client channel → notify client
          if (task.clientId) recipientIds.push(task.clientId);
        }
      } else {
        if (role === "WORKER") {
          // Worker uploaded → notify admins
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else {
          // Admin uploaded to worker channel → notify workers
          recipientIds.push(...task.workers.map((w) => w.userId));
        }
      }

      const finalRecipients = recipientIds.filter((uid) => uid !== userId);
      await Promise.all(
        finalRecipients.map((recipientId) =>
          prisma.notification.create({
            data: {
              userId: recipientId,
              type: "TASK_FILE_UPLOADED",
              title: "New file uploaded",
              message,
              link,
              taskId: taskIdNum,
              threadType,
              read: false,
            },
          })
        )
      );
    } catch (err) {
      console.error("Failed to send file upload notification:", err);
    }

    res.status(201).json(file);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// post task comment
router.post("/:taskId/files/:fileId/comments", verifyJWT, async (req: any, res) => {
  try {
    const taskIdNum = parseInt(req.params.taskId, 10);
    const fileIdNum = parseInt(req.params.fileId, 10);
    if (isNaN(taskIdNum) || isNaN(fileIdNum)) {
      return res.status(400).json({ error: "Invalid task or file id" });
    }
    const { content } = req.body;
    const { role, userId: authUserId } = req.user;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const file = await prisma.taskFile.findFirst({
      where: {
        id: fileIdNum,
        taskId: taskIdNum
      }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found or doesn't belong to this task" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskIdNum },
      include: { workers: { select: { userId: true } } }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Authorize access to the task by role.
    if (role === "WORKER") {
      if (!task.workers.some((tw) => tw.userId === authUserId)) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
    } else if (role === "CLIENT") {
      if (Number(task.clientId) !== clientScopeId(req.user)) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
    } else if (role === "ERASPHERE") {
      const referred = await prisma.user.findMany({
        where: { role: "CLIENT", referredById: authUserId },
        select: { id: true },
      });
      if (task.clientId === null || !referred.some((c) => c.id === task.clientId)) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
    } else if (role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to comment on this task" });
    }

    // Channel isolation: a comment may only be posted on a file in the commenter's
    // channel, and it inherits that file's channel. Internal files are worker/admin;
    // client-channel files are client/erasphere/admin.
    if ((role === "CLIENT" || role === "ERASPHERE") && !file.visibleToClient) {
      return res.status(403).json({ error: "Not authorized to access this file" });
    }
    if (role === "WORKER" && file.visibleToClient) {
      return res.status(403).json({ error: "Not authorized to access this file" });
    }
    const visibleToClient = file.visibleToClient;

    const comment = await prisma.fileComment.create({
      data: {
        fileId: fileIdNum,
        userId: authUserId,
        content: content.trim(),
        visibleToClient,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    const commenterName = (comment.user as { name: string }).name;
    const authorRole = (comment.user as { role?: string })?.role ?? "WORKER";

    // Channel-isolated notification routing (mirror task comments — the generic
    // emit() routing is channel-unaware and would notify the wrong side):
    //   Client channel  → client posts notify admins; admin posts notify the client
    //   Worker channel  → worker posts notify admins; admin posts notify task workers
    // An internal file comment must never notify the client, and a client-channel
    // file comment must never notify task workers.
    try {
      const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      const recipientIds: number[] = [];
      if (visibleToClient) {
        if (role === "CLIENT") {
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else if (task.clientId != null) {
          recipientIds.push(task.clientId);
        }
      } else {
        if (role === "WORKER") {
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else {
          recipientIds.push(...task.workers.map((w) => w.userId));
        }
      }
      const finalRecipients = recipientIds.filter((uid) => uid !== authUserId);
      await Promise.all(
        finalRecipients.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "TASK_COMMENT_ADDED",
              title: "New comment on file",
              message: `${commenterName} commented on a file in task "${task.title}"`,
              link: `/tasks/${taskIdNum}?highlightFileComment=${comment.id}`,
              taskId: taskIdNum,
              sourceRole: authorRole,
              threadType: visibleToClient ? "client" : "internal",
              read: false,
            },
          })
        )
      );
    } catch (notifErr: any) {
      console.error("File comment notification failed (comment still saved):", notifErr?.message ?? notifErr);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error adding file comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// post general comment
router.post("/:id/comments", verifyJWT, async (req: any, res) => {
  try {
    const { id } = req.params;
    const taskIdNum = parseInt(id, 10);
    if (isNaN(taskIdNum)) {
      return res.status(400).json({ error: "Invalid task id" });
    }
    const { content, visibleToClient: visibleToClientBody } = req.body;
    const authUserId = req.user?.userId != null ? Number(req.user.userId) : null;
    const role = req.user?.role;
    if (authUserId == null || isNaN(authUserId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskIdNum },
      include: { workers: { select: { userId: true } } },
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (role === "WORKER") {
      const canComment = task.workers.some((w) => w.userId === authUserId);
      if (!canComment) return res.status(403).json({ error: "Not authorized to comment on this task" });
    }
    if (role === "CLIENT" && Number(task.clientId) !== clientScopeId(req.user)) {
      return res.status(403).json({ error: "Not authorized to comment on this task" });
    }
    if (role === "ERASPHERE") {
      const referred = await prisma.user.findMany({
        where: { role: "CLIENT", referredById: authUserId },
        select: { id: true },
      });
      if (task.clientId === null || !referred.some((c) => c.id === task.clientId)) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
    }

    const visibleToClient = role === "CLIENT" ? true : (visibleToClientBody === true || visibleToClientBody === "true");

    const comment = await prisma.taskComment.create({
      data: {
        taskId: taskIdNum,
        userId: authUserId,
        content: content.trim(),
        visibleToClient,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    try {
      const authorRole = comment.user && typeof (comment.user as { role?: string }).role === "string"
        ? (comment.user as { role: string }).role
        : "WORKER";
      const realName = comment.user && typeof (comment.user as { name?: string }).name === "string"
        ? (comment.user as { name: string }).name
        : "Someone";
      // Privacy: if a worker posts a client-visible comment, the client's
      // notification must show the codename, not the real name.
      const commenterName = authorRole === "WORKER" && visibleToClient ? workerAlias(authUserId) : realName;

      // Channel-isolated notification routing:
      //   Client channel (visibleToClient=true):
      //     Client posts → notify admins only
      //     Admin posts  → notify client only
      //   Worker channel (visibleToClient=false):
      //     Worker posts → notify admins only
      //     Admin posts  → notify task workers only
      const taskWithWorkers = await prisma.task.findUnique({
        where: { id: taskIdNum },
        select: { clientId: true, workers: { select: { userId: true } } },
      });
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      const recipientIds: number[] = [];
      if (visibleToClient) {
        if (role === "CLIENT") {
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else {
          if (taskWithWorkers?.clientId) recipientIds.push(taskWithWorkers.clientId);
        }
      } else {
        if (role === "WORKER") {
          recipientIds.push(...adminUsers.map((a) => a.id));
        } else {
          recipientIds.push(...(taskWithWorkers?.workers.map((w) => w.userId) ?? []));
        }
      }
      const finalRecipients = recipientIds.filter((uid) => uid !== authUserId);

      await Promise.all(
        finalRecipients.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "TASK_COMMENT_ADDED",
              title: "New comment on task",
              message: `${commenterName} commented on task "${task.title}"`,
              link: `/tasks/${id}?highlightComment=${comment.id}`,
              taskId: taskIdNum,
              sourceRole: authorRole,
              threadType: visibleToClient ? "client" : "internal",
              read: false,
            },
          })
        )
      );
    } catch (notifErr: any) {
      console.error("Notification failed (comment still saved):", notifErr?.message ?? notifErr);
    }

    res.status(201).json(comment);
  } catch (error: any) {
    const code = error?.code;
    const meta = error?.meta;
    console.error("Error adding comment:", {
      message: error?.message,
      code,
      meta,
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    });
    if (code === "P2003") return res.status(400).json({ error: "Task not found or invalid." });
    if (code === "P2014") return res.status(400).json({ error: "Invalid reference." });
    const payload: { error: string; details?: string } = { error: "Failed to add comment" };
    if (process.env.NODE_ENV !== "production" && error?.message) payload.details = error.message;
    res.status(500).json(payload);
  }
});

// delete an uploaded task file — admins delete any; everyone else only their own upload.
router.delete("/:taskId/files/:fileId", verifyJWT, async (req: any, res) => {
  try {
    const fileId = Number(req.params.fileId);
    if (isNaN(fileId)) return res.status(400).json({ error: "Invalid file id" });
    const { role, userId } = req.user;

    const file = await prisma.taskFile.findUnique({
      where: { id: fileId },
      select: { id: true, uploadedBy: true },
    });
    if (!file) return res.status(404).json({ error: "File not found" });

    if (role !== "ADMIN" && file.uploadedBy !== userId) {
      return res.status(403).json({ error: "You can only delete files you uploaded" });
    }

    await prisma.fileComment.deleteMany({ where: { fileId } });
    await prisma.taskFile.delete({ where: { id: fileId } });
    res.json({ message: "File deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ error: "File not found" });
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// delete a task comment — admins delete any; everyone else only their own.
router.delete("/:taskId/comments/:commentId", verifyJWT, async (req: any, res) => {
  try {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) return res.status(400).json({ error: "Invalid comment id" });
    const { role, userId } = req.user;

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (role !== "ADMIN" && comment.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    res.json({ message: "Comment deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Comment not found" });
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// update task
router.put("/:id", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    const taskId = Number(req.params.id);

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { workers: { include: { user: true } } }
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isAssignedWorker = existingTask.workers.some((tw) => tw.userId === userId);
    if (role === "WORKER" && !isAssignedWorker) {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }
    if (role === "CLIENT") {
      return res.status(403).json({ error: "Clients cannot update tasks" });
    }
    if (role === "ERASPHERE") {
      const referredIds = await getReferredClientIds(userId);
      if (existingTask.clientId === null || !referredIds.includes(existingTask.clientId)) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
    }

    const { title, description, status, dueDate, workerIds, clientId, projectId } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (projectId !== undefined) updateData.projectId = projectId;

    // Reassigning the owning client or the worker roster is admin-only.
    if (role === "ADMIN") {
      if (clientId !== undefined) updateData.clientId = clientId;
      if (workerIds !== undefined && Array.isArray(workerIds)) {
        await prisma.taskWorker.deleteMany({ where: { taskId } });
        if (workerIds.length > 0) {
          await prisma.taskWorker.createMany({
            data: workerIds.map((uid: number) => ({ taskId, userId: Number(uid) }))
          });
        }
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
            company: true,
            role: true
          }
        },
        workers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (role === "ADMIN" && workerIds !== undefined && Array.isArray(workerIds) && workerIds.length > 0) {
      await emit(EventType.TASK_ASSIGNED, {
        title: "New Task Assigned",
        message: `You have been assigned to task: "${updatedTask.title}"`,
        link: `/tasks/${taskId}`,
        taskId,
        actorId: req.user.userId,
      });
    }

    if (status && status !== existingTask.status) {
      if (status === "PENDING_APPROVAL") {
        await emit(EventType.TASK_PENDING_APPROVAL, {
          title: "Task Pending Approval",
          message: `Task "${updatedTask.title}" is pending your approval`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      } else if (status === "COMPLETED") {
        await emit(EventType.TASK_COMPLETED, {
          title: "Task Completed",
          message: `Task "${updatedTask.title}" has been marked as completed`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      } else {
        await emit(EventType.TASK_STATUS_CHANGED, {
          title: "Task Status Updated",
          message: `Task "${updatedTask.title}" status changed to ${status}`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: req.user.userId,
        });
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// delete task
router.delete("/:id", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    if (role !== "ADMIN" && role !== "ERASPHERE") {
      return res.status(403).json({ error: "Only admins or EraSphere can delete tasks" });
    }

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { clientId: true } });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (role === "ERASPHERE") {
      const referredIds = await getReferredClientIds(userId);
      if (task.clientId === null || !referredIds.includes(task.clientId)) {
        return res.status(403).json({ error: "Not authorized to delete this task" });
      }
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// PATCH /tasks/:taskId/files/:fileId/review — admin submits a review decision on a file
// POST /tasks/:taskId/files/:fileId/forward — admin clones a deliverable into the
// other channel (worker <-> client) so it doesn't have to be re-uploaded by hand.
router.post("/:taskId/files/:fileId/forward", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const fileId = Number(req.params.fileId);
    const { userId: adminId } = req.user;
    const toClient = Boolean(req.body.toClient);

    const src = await prisma.taskFile.findFirst({
      where: { id: fileId, taskId },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });
    if (!src) return res.status(404).json({ error: "File not found in this task" });

    // Reference the same file on disk; just a new row in the target channel.
    const clone = await prisma.taskFile.create({
      data: {
        taskId,
        fileName: src.fileName,
        fileUrl: src.fileUrl,
        fileType: src.fileType,
        section: src.section,
        caption: src.caption ? `↪ Forwarded · ${src.caption}` : "↪ Forwarded deliverable",
        visibleToClient: toClient,
        uploadedBy: adminId,
      },
    });

    // Carry over the file's description/discussion (its reply comments) so the
    // forwarded deliverable arrives with its context, in the target channel.
    if (src.comments.length) {
      await prisma.fileComment.createMany({
        data: src.comments.map((c) => ({
          fileId: clone.id,
          userId: c.userId,
          content: c.content,
          visibleToClient: toClient,
        })),
      });
    }
    res.status(201).json(clone);
  } catch (error) {
    console.error("Error forwarding file:", error);
    res.status(500).json({ error: "Failed to forward file" });
  }
});

router.patch("/:taskId/files/:fileId/review", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const fileId = Number(req.params.fileId);
    const { status, comment } = req.body;
    const { userId: adminId } = req.user;

    const validStatuses = ["APPROVED", "NEEDS_REVISION", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid review status. Must be APPROVED, NEEDS_REVISION, or REJECTED" });
    }
    if ((status === "NEEDS_REVISION" || status === "REJECTED") && !comment?.trim()) {
      return res.status(400).json({ error: "A comment is required when requesting revision or rejecting a file" });
    }

    const taskFile = await prisma.taskFile.findFirst({
      where: { id: fileId, taskId },
      include: {
        task: { select: { title: true, clientId: true } },
      },
    });
    if (!taskFile) {
      return res.status(404).json({ error: "File not found in this task" });
    }
    if (taskFile.reviewStatus === "APPROVED") {
      return res.status(400).json({ error: "This file has already been approved and cannot be re-reviewed." });
    }

    const updated = await prisma.taskFile.update({
      where: { id: fileId },
      data: {
        reviewStatus: status,
        reviewComment: comment?.trim() || null,
      },
    });

    // Build per-recipient messages
    const fileName = taskFile.fileName;
    const taskTitle = taskFile.task.title;
    const link = `/tasks/${taskId}`;

    let uploaderMessage: string;
    let clientMessage: string;
    if (status === "APPROVED") {
      uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" was approved ✅`;
      clientMessage = `A file "${fileName}" on task "${taskTitle}" has been approved ✅`;
    } else if (status === "NEEDS_REVISION") {
      uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" needs revision — ${comment!.trim()}`;
      clientMessage = `A file "${fileName}" on task "${taskTitle}" requires revision`;
    } else {
      uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" was rejected — ${comment!.trim()}`;
      clientMessage = `A file "${fileName}" on task "${taskTitle}" was rejected`;
    }

    // Notify the file uploader (usually the worker) if not the reviewing admin
    const recipientNotifications: { userId: number; message: string }[] = [];
    if (taskFile.uploadedBy !== adminId) {
      recipientNotifications.push({ userId: taskFile.uploadedBy, message: uploaderMessage });
    }
    // Notify the task client ONLY for client-channel files. Internal (worker-channel)
    // files are not visible to the client, so a review of one must not leak to them.
    if (taskFile.visibleToClient && taskFile.task.clientId && taskFile.task.clientId !== adminId) {
      recipientNotifications.push({ userId: taskFile.task.clientId, message: clientMessage });
    }

    await Promise.all(
      recipientNotifications.map(({ userId, message }) =>
        prisma.notification.create({
          data: {
            userId,
            type: "TASK_FILE_REVIEWED",
            title: "File Review Update",
            message,
            link,
            read: false,
          },
        })
      )
    );

    res.json(updated);
  } catch (error) {
    console.error("Error submitting file review:", error);
    res.status(500).json({ error: "Failed to submit file review" });
  }
});

// ============================ Milestones ============================
// Progress steps within a task. Admin/worker/client can add them; admin or an
// assigned worker marks them done; progress = % done (equal weight).

type MiniTask = { id: number; clientId: number | null; workers: { userId: number }[] };

async function loadTaskForMilestone(taskId: number): Promise<MiniTask | null> {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, clientId: true, workers: { select: { userId: true } } },
  });
}

/** Can this user see/add milestones on the task? (admin, assigned worker, the
 *  task's client, or an EraSphere partner who referred the client.) */
async function canAccessMilestones(task: MiniTask, user: ReqUser): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "WORKER") return task.workers.some((w) => w.userId === user.userId);
  if (user.role === "CLIENT") return task.clientId === clientScopeId(user);
  if (user.role === "ERASPHERE" && task.clientId) {
    return (await getReferredClientIds(user.userId)).includes(task.clientId);
  }
  return false;
}

/** Only admins and assigned workers can mark milestones done. */
function canCompleteMilestones(task: MiniTask, user: ReqUser): boolean {
  return user.role === "ADMIN" || (user.role === "WORKER" && task.workers.some((w) => w.userId === user.userId));
}

// list milestones for a task
router.get("/:id/milestones", verifyJWT, async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const task = await loadTaskForMilestone(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await canAccessMilestones(task, req.user))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const milestones = await prisma.milestone.findMany({
      where: { taskId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
    });
    res.json(milestones);
  } catch (error) {
    console.error("Error listing milestones:", error);
    res.status(500).json({ error: "Failed to load to-dos" });
  }
});

// create a milestone (optional images). upload.any() accepts files under any
// field name ("images", "image", …) so an older cached client still works.
router.post("/:id/milestones", verifyJWT, upload.any(), async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Title is required" });

    const task = await loadTaskForMilestone(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await canAccessMilestones(task, req.user))) {
      return res.status(403).json({ error: "Not authorized to add to-dos to this task" });
    }

    const last = await prisma.milestone.findFirst({
      where: { taskId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const files = (req.files as Express.Multer.File[]) || [];
    const milestone = await prisma.milestone.create({
      data: {
        taskId,
        title: title.slice(0, 160),
        description: req.body.description ? String(req.body.description).trim() : null,
        imageUrls: files.map((f) => `/uploads/${f.filename}`),
        createdById: req.user.userId,
        order: (last?.order ?? 0) + 1,
      },
    });

    // When the CLIENT adds a to-do, quietly notify the assigned workers (bell
    // only — we intentionally do NOT post it into the chat to keep the chat for
    // communication; the to-do shows up in the To-dos panel).
    if (req.user.role === "CLIENT") {
      const workerIds = task.workers.map((w) => w.userId);
      if (workerIds.length) {
        prisma.notification
          .createMany({
            data: workerIds.map((wid) => ({
              userId: wid,
              type: "TODO_ADDED",
              title: "New to-do from client",
              message: `The client added a to-do: “${milestone.title}”`,
              link: `/tasks/${taskId}`,
              read: false,
            })),
          })
          .catch((e) => console.error("Failed to notify workers of to-do:", e));
      }
    }

    res.status(201).json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({ error: "Failed to create to-do" });
  }
});

// add more images to an existing to-do
router.post("/:id/milestones/:mid/images", verifyJWT, upload.any(), async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    const mid = Number(req.params.mid);
    const task = await loadTaskForMilestone(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await canAccessMilestones(task, req.user))) return res.status(403).json({ error: "Not authorized" });
    const milestone = await prisma.milestone.findFirst({ where: { id: mid, taskId } });
    if (!milestone) return res.status(404).json({ error: "To-do not found" });

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return res.status(400).json({ error: "No images uploaded" });
    const updated = await prisma.milestone.update({
      where: { id: mid },
      data: { imageUrls: { push: files.map((f) => `/uploads/${f.filename}`) } },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error adding to-do images:", error);
    res.status(500).json({ error: "Failed to add images" });
  }
});

// remove one image from a to-do (admin or creator)
router.delete("/:id/milestones/:mid/images", verifyJWT, async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    const mid = Number(req.params.mid);
    const { userId, role } = req.user;
    const url = String(req.body.url || "");
    const milestone = await prisma.milestone.findFirst({ where: { id: mid, taskId } });
    if (!milestone) return res.status(404).json({ error: "To-do not found" });
    if (role !== "ADMIN" && milestone.createdById !== userId) {
      return res.status(403).json({ error: "Not authorized to edit this to-do" });
    }
    const updated = await prisma.milestone.update({
      where: { id: mid },
      data: {
        imageUrls: (milestone.imageUrls || []).filter((u) => u !== url),
        imageUrl: milestone.imageUrl === url ? null : milestone.imageUrl,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error removing to-do image:", error);
    res.status(500).json({ error: "Failed to remove image" });
  }
});

// update a milestone (toggle done by staff; edit title/description by staff or creator)
router.patch("/:id/milestones/:mid", verifyJWT, async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    const mid = Number(req.params.mid);
    const { userId, role } = req.user;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, clientId: true, workers: { select: { userId: true } }, client: { select: { id: true, name: true, email: true } } },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!(await canAccessMilestones(task as any, req.user))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const milestone = await prisma.milestone.findFirst({ where: { id: mid, taskId } });
    if (!milestone) return res.status(404).json({ error: "To-do not found" });

    const data: any = {};
    const isStaff = canCompleteMilestones(task as any, req.user);

    if ("title" in req.body || "description" in req.body) {
      if (!isStaff && milestone.createdById !== userId) {
        return res.status(403).json({ error: "You can only edit to-dos you created" });
      }
      if (typeof req.body.title === "string" && req.body.title.trim()) data.title = req.body.title.trim().slice(0, 160);
      if ("description" in req.body) data.description = req.body.description ? String(req.body.description).trim() : null;
    }

    let justCompleted = false;
    if (typeof req.body.isDone === "boolean") {
      if (!isStaff) return res.status(403).json({ error: "Only admins and assigned workers can complete to-dos" });
      data.isDone = req.body.isDone;
      data.doneAt = req.body.isDone ? new Date() : null;
      data.doneBy = req.body.isDone ? userId : null;
      justCompleted = req.body.isDone && !milestone.isDone;
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });

    const updated = await prisma.milestone.update({ where: { id: mid }, data });

    // Notify + email the client ONLY when every to-do is complete (100%),
    // not on each individual one.
    if (justCompleted) {
      const all = await prisma.milestone.findMany({ where: { taskId }, select: { isDone: true } });
      const total = all.length;
      const done = all.filter((m) => m.isDone).length;
      const allDone = total > 0 && done === total;
      const clientId = (task as any).clientId as number | null;
      const client = (task as any).client as { id: number; name: string | null; email: string } | null;

      if (allDone && clientId && clientId !== userId) {
        prisma.notification
          .create({
            data: {
              userId: clientId,
              type: "TASK_TODOS_COMPLETE",
              title: "All to-dos complete",
              message: `All to-dos are done on "${(task as any).title}" — 100% complete 🎉`,
              link: `/tasks/${taskId}`,
              read: false,
            },
          })
          .catch((e) => console.error("Failed to-dos-complete notification:", e));

        if (client?.email) {
          sendMilestoneDoneEmail({
            to: client.email,
            clientName: client.name,
            taskId,
            taskTitle: (task as any).title,
            done,
            total,
          }).catch((e) => console.error("Failed to-dos-complete email:", e));
        }
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ error: "Failed to update to-do" });
  }
});

// delete a milestone (admin or its creator)
router.delete("/:id/milestones/:mid", verifyJWT, async (req: any, res) => {
  try {
    const taskId = Number(req.params.id);
    const mid = Number(req.params.mid);
    const { userId, role } = req.user;
    const milestone = await prisma.milestone.findFirst({ where: { id: mid, taskId } });
    if (!milestone) return res.status(404).json({ error: "To-do not found" });
    if (role !== "ADMIN" && milestone.createdById !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this to-do" });
    }
    await prisma.milestone.delete({ where: { id: mid } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({ error: "Failed to delete to-do" });
  }
});

export default router;