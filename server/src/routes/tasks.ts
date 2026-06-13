import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import multer from "multer";
import path from "path";
import { emit, EventType } from "../services/notificationEngine";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";

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
                  role: true
                }
              }
            }
          }
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
        where: { clientId: userId }, 
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
      tasks = (tasks as any[]).map((t: any) => ({
        ...t,
        comments: (t.comments ?? []).filter((c: { visibleToClient: boolean }) => c.visibleToClient),
        files: (t.files ?? []).filter((f: { visibleToClient: boolean }) => f.visibleToClient),
      }));
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
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isAssignedWorker = task.workers.some((tw) => tw.userId === userId);
    if (role === "WORKER" && !isAssignedWorker) {
      return res.status(403).json({ error: "Not authorized to view this task" });
    }
    if (role === "CLIENT" && task.clientId !== userId) {
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
          select: { id: true, name: true, role: true },
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
    } else if (role === "WORKER") {
      (task as any).comments = (task as any).comments.filter((c: { visibleToClient: boolean }) => !c.visibleToClient);
      (task as any).files = (task as any).files.filter((f: { visibleToClient: boolean }) => !f.visibleToClient);
      (task as any).files = (task as any).files.map((f: { comments: { visibleToClient: boolean }[] }) => ({
        ...f,
        comments: f.comments.filter((c: { visibleToClient: boolean }) => !c.visibleToClient),
      }));
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
      (role === "CLIENT" && task.clientId === userId);
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
      if (Number(task.clientId) !== authUserId) {
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
    await emit(EventType.TASK_COMMENT_ADDED, {
      title: "New comment on file",
      message: `${commenterName} commented on a file in task "${task.title}"`,
      link: `/tasks/${taskIdNum}?highlightFileComment=${comment.id}`,
      taskId: taskIdNum,
      actorId: authUserId,
      actorRole: authorRole,
      threadType: visibleToClient ? "client" : "internal",
    });

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
    if (role === "CLIENT" && Number(task.clientId) !== authUserId) {
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
      const commenterName = comment.user && typeof (comment.user as { name?: string }).name === "string"
        ? (comment.user as { name: string }).name
        : "Someone";
      const authorRole = comment.user && typeof (comment.user as { role?: string }).role === "string"
        ? (comment.user as { role: string }).role
        : "WORKER";

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

    const { title, description, status, dueDate, workerIds, clientId, projectId } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (projectId !== undefined) updateData.projectId = projectId;

    if (role === "ADMIN" || role === "ERASPHERE") {
      if (clientId !== undefined) updateData.clientId = clientId;
      if (role === "ADMIN" && workerIds !== undefined && Array.isArray(workerIds)) {
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
    const { role } = req.user;
    if (role !== "ADMIN" && role !== "ERASPHERE") {
      return res.status(403).json({ error: "Only admins or EraSphere can delete tasks" });
    }

    await prisma.task.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// PATCH /tasks/:taskId/files/:fileId/review — admin submits a review decision on a file
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

export default router;