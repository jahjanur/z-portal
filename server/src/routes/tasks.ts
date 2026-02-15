import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT } from "../middleware/auth";
import multer from "multer";
import path from "path";
import { notifyNewTask, notifyTaskPendingApproval, notifyTaskCompleted } from "../services/notifications";

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create tasks" });
    }

    const { title, description, clientId, workerIds, status, dueDate, projectId } = req.body;
    const workerIdList = Array.isArray(workerIds) ? workerIds : [];

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

    for (const tw of task.workers) {
      await notifyNewTask(task, { email: tw.user.email, name: tw.user.name });
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
      if (status === 'PENDING_APPROVAL') {
        for (const tw of existingTask.workers) {
          await notifyTaskPendingApproval(updatedTask, { name: tw.user.name });
        }
      } else if (status === 'COMPLETED') {
        const recipients: { email: string; name: string; role: string }[] = [];
        for (const tw of existingTask.workers) {
          recipients.push({ email: tw.user.email, name: tw.user.name, role: 'WORKER' });
        }
        if (updatedTask.client) {
          recipients.push({
            email: updatedTask.client.email,
            name: updatedTask.client.name,
            role: 'CLIENT'
          });
        }
        if (recipients.length > 0) {
          await notifyTaskCompleted(updatedTask, recipients);
        }
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
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = await prisma.taskFile.create({
      data: {
        taskId: parseInt(id),
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: fileType || "document",
        section: section || null,
        caption: caption || null,
        uploadedBy: parseInt(uploadedBy),
      },
    });

    res.status(201).json(file);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// post task comment
router.post("/:taskId/files/:fileId/comments", verifyJWT, async (req: any, res) => {
  try {
    const { taskId, fileId } = req.params;
    const { userId, content } = req.body;

    const file = await prisma.taskFile.findFirst({
      where: {
        id: parseInt(fileId),
        taskId: parseInt(taskId)
      }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found or doesn't belong to this task" });
    }

    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
      include: { workers: true }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { role, userId: authUserId } = req.user;
    const canComment = task.workers.some((tw) => tw.userId === authUserId);
    if (role === "WORKER" && !canComment) {
      return res.status(403).json({ error: "Not authorized to comment on this task" });
    }
    if (role === "CLIENT" && task.clientId !== authUserId) {
      return res.status(403).json({ error: "Not authorized to comment on this task" });
    }

    const comment = await prisma.fileComment.create({
      data: {
        fileId: parseInt(fileId),
        userId: parseInt(userId),
        content,
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
    const { userId, content } = req.body;

    const comment = await prisma.taskComment.create({
      data: {
        taskId: parseInt(id),
        userId: parseInt(userId),
        content,
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

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
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

    if (status && status !== existingTask.status) {
      const workersList = updatedTask.workers.map((tw) => tw.user);
      if (status === 'PENDING_APPROVAL') {
        for (const w of workersList) {
          await notifyTaskPendingApproval(updatedTask, { name: w.name });
        }
      } else if (status === 'COMPLETED') {
        const recipients = workersList.map((w) => ({ email: w.email, name: w.name, role: 'WORKER' as const }));
        if (updatedTask.client) {
          recipients.push({ email: updatedTask.client.email, name: updatedTask.client.name, role: 'CLIENT' });
        }
        if (recipients.length > 0) {
          await notifyTaskCompleted(updatedTask, recipients);
        }
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
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can delete tasks" });
    }

    await prisma.task.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;