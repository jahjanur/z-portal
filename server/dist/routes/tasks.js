"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const notifications_1 = require("../services/notifications");
const notificationStore_1 = require("../services/notificationStore");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
// get all tasks
router.get("/", auth_1.verifyJWT, async (req, res) => {
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
            tasks = await prisma_1.default.task.findMany({
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
        }
        else if (role === "ERASPHERE") {
            const referredClientIds = await prisma_1.default.user.findMany({
                where: { role: "CLIENT", referredById: userId },
                select: { id: true },
            }).then((rows) => rows.map((r) => r.id));
            tasks = await prisma_1.default.task.findMany({
                where: { clientId: { in: referredClientIds } },
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
        }
        else if (role === "WORKER") {
            tasks = await prisma_1.default.task.findMany({
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
        }
        else if (role === "CLIENT") {
            tasks = await prisma_1.default.task.findMany({
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
        }
        else {
            return res.status(403).json({ error: "Invalid role" });
        }
        res.json(tasks);
    }
    catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});
// get task id
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const taskId = Number(req.params.id);
        const task = await prisma_1.default.task.findUnique({
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
        res.json(task);
    }
    catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ error: "Failed to fetch task" });
    }
});
// create task
router.post("/", auth_1.verifyJWT, async (req, res) => {
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
        const client = await prisma_1.default.user.findUnique({
            where: { id: clientId }
        });
        if (!client || client.role !== "CLIENT") {
            return res.status(400).json({ error: "Invalid client ID" });
        }
        for (const wid of workerIdList) {
            const worker = await prisma_1.default.user.findUnique({
                where: { id: Number(wid) }
            });
            if (!worker || worker.role !== "WORKER") {
                return res.status(400).json({ error: `Invalid worker ID: ${wid}` });
            }
        }
        if (projectId) {
            const project = await prisma_1.default.project.findUnique({
                where: { id: projectId }
            });
            if (!project) {
                return res.status(400).json({ error: "Invalid project ID" });
            }
        }
        const task = await prisma_1.default.task.create({
            data: {
                title,
                description: description || null,
                clientId,
                projectId: projectId || null,
                status: status || "PENDING",
                ...(dueDate && { dueDate: new Date(dueDate) }),
                workers: workerIdList.length
                    ? { create: workerIdList.map((userId) => ({ userId: Number(userId) })) }
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
            await (0, notifications_1.notifyNewTask)(task, { email: tw.user.email, name: tw.user.name });
            await (0, notificationStore_1.createNotification)(tw.user.id, "TASK_ASSIGNED", "New Task Assigned", `You have been assigned to task: "${task.title}"`, `/tasks/${task.id}`);
        }
        // Notify client about the new task
        await (0, notificationStore_1.createNotification)(clientId, "TASK_CREATED", "New Task Created", `A new task "${task.title}" has been created for you`, `/tasks/${task.id}`);
        if (req.user?.role === "ERASPHERE") {
            try {
                const partner = await prisma_1.default.user.findUnique({
                    where: { id: req.user.userId },
                    select: { name: true },
                });
                const clientName = task.client?.name ?? task.client?.company ?? "client";
                await (0, notificationStore_1.notifyAdmins)("ERASPHERE_NEW_TASK", "EraSphere added a task", `${partner?.name ?? "EraSphere partner"} added task "${task.title}" for ${clientName}`, "/admin/tasks");
            }
            catch (err) {
                console.error("Failed to notify admins of new EraSphere task:", err);
            }
        }
        res.status(201).json(task);
    }
    catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});
// patch task status
router.patch("/:id/status", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const taskId = Number(req.params.id);
        const { status } = req.body;
        const existingTask = await prisma_1.default.task.findUnique({
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
        const updatedTask = await prisma_1.default.task.update({
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
                    await (0, notifications_1.notifyTaskPendingApproval)(updatedTask, { name: tw.user.name });
                }
                // Notify admins that task is pending approval
                const admins = await prisma_1.default.user.findMany({ where: { role: "ADMIN" } });
                for (const admin of admins) {
                    await (0, notificationStore_1.createNotification)(admin.id, "TASK_PENDING_APPROVAL", "Task Pending Approval", `Task "${updatedTask.title}" is pending your approval`, `/tasks/${taskId}`);
                }
            }
            else if (status === 'COMPLETED') {
                const recipients = [];
                for (const tw of existingTask.workers) {
                    recipients.push({ email: tw.user.email, name: tw.user.name, role: 'WORKER' });
                    await (0, notificationStore_1.createNotification)(tw.userId, "TASK_COMPLETED", "Task Completed", `Task "${updatedTask.title}" has been marked as completed`, `/tasks/${taskId}`);
                }
                if (updatedTask.client) {
                    recipients.push({
                        email: updatedTask.client.email,
                        name: updatedTask.client.name,
                        role: 'CLIENT'
                    });
                    await (0, notificationStore_1.createNotification)(updatedTask.client.id, "TASK_COMPLETED", "Task Completed", `Your task "${updatedTask.title}" has been completed`, `/tasks/${taskId}`);
                }
                if (recipients.length > 0) {
                    await (0, notifications_1.notifyTaskCompleted)(updatedTask, recipients);
                }
            }
            else {
                // Generic status change notification to client
                if (updatedTask.clientId) {
                    await (0, notificationStore_1.createNotification)(updatedTask.clientId, "TASK_UPDATED", "Task Status Updated", `Task "${updatedTask.title}" status changed to ${status}`, `/tasks/${taskId}`);
                }
            }
        }
        res.json(updatedTask);
    }
    catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ error: "Failed to update task status" });
    }
});
// post files
router.post("/:id/files", auth_1.verifyJWT, upload.single("file"), async (req, res) => {
    try {
        const { id } = req.params;
        const { section, caption, fileType, uploadedBy } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const file = await prisma_1.default.taskFile.create({
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
    }
    catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});
// post task comment
router.post("/:taskId/files/:fileId/comments", auth_1.verifyJWT, async (req, res) => {
    try {
        const { taskId, fileId } = req.params;
        const { userId, content } = req.body;
        const file = await prisma_1.default.taskFile.findFirst({
            where: {
                id: parseInt(fileId),
                taskId: parseInt(taskId)
            }
        });
        if (!file) {
            return res.status(404).json({ error: "File not found or doesn't belong to this task" });
        }
        const task = await prisma_1.default.task.findUnique({
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
        const comment = await prisma_1.default.fileComment.create({
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
    }
    catch (error) {
        console.error("Error adding file comment:", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});
// post general comment
router.post("/:id/comments", auth_1.verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, content } = req.body;
        const comment = await prisma_1.default.taskComment.create({
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
    }
    catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});
// update task
router.put("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const taskId = Number(req.params.id);
        const existingTask = await prisma_1.default.task.findUnique({
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
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (status !== undefined)
            updateData.status = status;
        if (dueDate !== undefined)
            updateData.dueDate = new Date(dueDate);
        if (projectId !== undefined)
            updateData.projectId = projectId;
        if (role === "ADMIN" || role === "ERASPHERE") {
            if (clientId !== undefined)
                updateData.clientId = clientId;
            if (role === "ADMIN" && workerIds !== undefined && Array.isArray(workerIds)) {
                await prisma_1.default.taskWorker.deleteMany({ where: { taskId } });
                if (workerIds.length > 0) {
                    await prisma_1.default.taskWorker.createMany({
                        data: workerIds.map((uid) => ({ taskId, userId: Number(uid) }))
                    });
                }
            }
        }
        const updatedTask = await prisma_1.default.task.update({
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
            for (const tw of updatedTask.workers) {
                await (0, notificationStore_1.createNotification)(tw.user.id, "TASK_ASSIGNED", "New Task Assigned", `You have been assigned to task: "${updatedTask.title}"`, `/tasks/${taskId}`);
            }
        }
        if (status && status !== existingTask.status) {
            const workersList = updatedTask.workers.map((tw) => tw.user);
            if (status === 'PENDING_APPROVAL') {
                for (const w of workersList) {
                    await (0, notifications_1.notifyTaskPendingApproval)(updatedTask, { name: w.name });
                }
                const admins = await prisma_1.default.user.findMany({ where: { role: "ADMIN" } });
                for (const admin of admins) {
                    await (0, notificationStore_1.createNotification)(admin.id, "TASK_PENDING_APPROVAL", "Task Pending Approval", `Task "${updatedTask.title}" is pending your approval`, `/tasks/${taskId}`);
                }
            }
            else if (status === 'COMPLETED') {
                const recipients = workersList.map((w) => ({ email: w.email, name: w.name, role: 'WORKER' }));
                for (const tw of updatedTask.workers) {
                    await (0, notificationStore_1.createNotification)(tw.user.id, "TASK_COMPLETED", "Task Completed", `Task "${updatedTask.title}" has been marked as completed`, `/tasks/${taskId}`);
                }
                if (updatedTask.client) {
                    recipients.push({ email: updatedTask.client.email, name: updatedTask.client.name, role: 'CLIENT' });
                    await (0, notificationStore_1.createNotification)(updatedTask.client.id, "TASK_COMPLETED", "Task Completed", `Your task "${updatedTask.title}" has been completed`, `/tasks/${taskId}`);
                }
                if (recipients.length > 0) {
                    await (0, notifications_1.notifyTaskCompleted)(updatedTask, recipients);
                }
            }
            else if (updatedTask.clientId) {
                await (0, notificationStore_1.createNotification)(updatedTask.clientId, "TASK_UPDATED", "Task Status Updated", `Task "${updatedTask.title}" status changed to ${status}`, `/tasks/${taskId}`);
            }
        }
        res.json(updatedTask);
    }
    catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
    }
});
// delete task
router.delete("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN" && role !== "ERASPHERE") {
            return res.status(403).json({ error: "Only admins or EraSphere can delete tasks" });
        }
        await prisma_1.default.task.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});
exports.default = router;
//# sourceMappingURL=tasks.js.map