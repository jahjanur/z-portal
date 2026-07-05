"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const notificationEngine_1 = require("../services/notificationEngine");
const prisma_1 = __importDefault(require("../lib/prisma"));
const uploadsPath_1 = require("../lib/uploadsPath");
const workerIdentity_1 = require("../lib/workerIdentity");
const milestoneEmail_1 = require("../services/milestoneEmail");
const clientScope_1 = require("../lib/clientScope");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath_1.uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
/** Client ids referred by an EraSphere partner. Used to scope a partner's
 *  access to only the tasks/clients they brought in. */
async function getReferredClientIds(userId) {
    const rows = await prisma_1.default.user.findMany({
        where: { role: "CLIENT", referredById: userId },
        select: { id: true },
    });
    return rows.map((r) => r.id);
}
// get all tasks
router.get("/", auth_1.verifyJWT, async (req, res) => {
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
            tasks = await prisma_1.default.task.findMany({
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
        }
        else if (role === "ERASPHERE") {
            const referredClientIds = await prisma_1.default.user.findMany({
                where: { role: "CLIENT", referredById: userId },
                select: { id: true },
            }).then((rows) => rows.map((r) => r.id));
            // If a clientId filter is given, only honor it when that client is referred by this partner.
            const scopedIds = filterClientId !== null
                ? referredClientIds.filter((cid) => cid === filterClientId)
                : referredClientIds;
            tasks = await prisma_1.default.task.findMany({
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
                where: { clientId: (0, clientScope_1.clientScopeId)(req.user) },
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
        // Channel visibility for list payloads — mirror GET /tasks/:id so internal
        // (worker-channel) files/comments never leak into a client's response, and
        // client-channel content isn't exposed to workers. ADMIN sees everything.
        if (role === "CLIENT" || role === "ERASPHERE") {
            tasks = tasks.map((t) => (0, workerIdentity_1.maskTaskWorkers)({
                ...t,
                comments: (t.comments ?? []).filter((c) => c.visibleToClient),
                files: (t.files ?? []).filter((f) => f.visibleToClient),
            }));
        }
        else if (role === "WORKER") {
            tasks = tasks.map((t) => ({
                ...t,
                comments: (t.comments ?? []).filter((c) => !c.visibleToClient),
                files: (t.files ?? []).filter((f) => !f.visibleToClient),
            }));
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
                milestones: { orderBy: [{ order: "asc" }, { id: "asc" }] },
                seoOrder: { include: { package: true } }
            }
        });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        // SEO orders replace the To-dos panel. Hide buy-side (provider) fields from
        // everyone but admins.
        if (role !== "ADMIN" && task.seoOrder?.package) {
            const pkg = task.seoOrder.package;
            delete pkg.providerName;
            delete pkg.providerPackage;
            delete pkg.providerCost;
            delete pkg.providerListPrice;
        }
        const isAssignedWorker = task.workers.some((tw) => tw.userId === userId);
        if (role === "WORKER" && !isAssignedWorker) {
            return res.status(403).json({ error: "Not authorized to view this task" });
        }
        if (role === "CLIENT" && task.clientId !== (0, clientScope_1.clientScopeId)(req.user)) {
            return res.status(403).json({ error: "Not authorized to view this task" });
        }
        if (role === "ERASPHERE") {
            const referredClientIds = await prisma_1.default.user
                .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
                .then((rows) => rows.map((r) => r.id));
            if (task.clientId === null || !referredClientIds.includes(task.clientId)) {
                return res.status(403).json({ error: "Not authorized to view this task" });
            }
        }
        // Resolve uploader name + role for every file (uploadedBy is a raw Int with no DB relation)
        const uploaderIds = [...new Set(task.files.map((f) => f.uploadedBy).filter(Boolean))];
        const uploaders = uploaderIds.length
            ? await prisma_1.default.user.findMany({
                where: { id: { in: uploaderIds } },
                select: { id: true, name: true, nickname: true, avatarEmoji: true, role: true },
            })
            : [];
        const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));
        task.files = task.files.map((f) => ({
            ...f,
            uploader: uploaderMap[f.uploadedBy] ?? null,
        }));
        // Channel visibility per role:
        //   CLIENT    → only client-channel content (visibleToClient: true)
        //   ERASPHERE → same as CLIENT
        //   WORKER    → only worker-channel content (visibleToClient: false)
        //   ADMIN     → all content, no filter
        if (role === "CLIENT" || role === "ERASPHERE") {
            task.comments = task.comments.filter((c) => c.visibleToClient);
            task.files = task.files.filter((f) => f.visibleToClient);
            task.files = task.files.map((f) => ({
                ...f,
                comments: f.comments.filter((c) => c.visibleToClient),
            }));
            // Privacy: external viewers see worker codenames + emoji, never real names/emails.
            (0, workerIdentity_1.maskTaskWorkers)(task);
        }
        else if (role === "WORKER") {
            task.comments = task.comments.filter((c) => !c.visibleToClient);
            task.files = task.files.filter((f) => !f.visibleToClient);
            task.files = task.files.map((f) => ({
                ...f,
                comments: f.comments.filter((c) => !c.visibleToClient),
            }));
        }
        // Privacy: a project's metadata may hold access credentials (logins) —
        // only ADMIN may see those. Strip them for workers/clients/partners.
        if (role !== "ADMIN" && task.project?.metadata && typeof task.project.metadata === "object") {
            const m = { ...task.project.metadata };
            delete m.credentials;
            task.project.metadata = m;
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
        await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_ASSIGNED, {
            title: "New Task Assigned",
            message: `You have been assigned to task: "${task.title}"`,
            link: `/tasks/${task.id}`,
            taskId: task.id,
            actorId: req.user.userId,
        });
        await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_CREATED, {
            title: "New Task Created",
            message: `A new task "${task.title}" has been created`,
            link: `/tasks/${task.id}`,
            taskId: task.id,
            clientId,
            actorId: req.user.userId,
        });
        if (req.user?.role === "ERASPHERE") {
            const partner = await prisma_1.default.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
            const clientName = task.client?.name ?? task.client?.company ?? "client";
            await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.ERASPHERE_NEW_TASK, {
                title: "EraSphere added a task",
                message: `${partner?.name ?? "EraSphere partner"} added task "${task.title}" for ${clientName}`,
                link: `/tasks/${task.id}`,
                taskId: task.id,
                actorId: req.user.userId,
            });
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
        if (role === "ERASPHERE") {
            const referredIds = await getReferredClientIds(userId);
            if (existingTask.clientId === null || !referredIds.includes(existingTask.clientId)) {
                return res.status(403).json({ error: "Not authorized to update this task" });
            }
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
            if (status === "PENDING_APPROVAL") {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_PENDING_APPROVAL, {
                    title: "Task Pending Approval",
                    message: `Task "${updatedTask.title}" is pending your approval`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
            }
            else if (status === "COMPLETED") {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_COMPLETED, {
                    title: "Task Completed",
                    message: `Task "${updatedTask.title}" has been marked as completed`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
            }
            else {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_STATUS_CHANGED, {
                    title: "Task Status Updated",
                    message: `Task "${updatedTask.title}" status changed to ${status}`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
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
        const { role, userId } = req.user;
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const taskIdNum = parseInt(id, 10);
        if (isNaN(taskIdNum)) {
            return res.status(400).json({ error: "Invalid task id" });
        }
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskIdNum },
            include: { workers: { select: { userId: true } } },
        });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        const isAssignedWorker = task.workers.some((w) => w.userId === userId);
        let canUpload = role === "ADMIN" ||
            (role === "WORKER" && isAssignedWorker) ||
            (role === "CLIENT" && task.clientId === (0, clientScope_1.clientScopeId)(req.user));
        if (role === "ERASPHERE" && task.clientId) {
            const referredClientIds = await prisma_1.default.user
                .findMany({ where: { role: "CLIENT", referredById: userId }, select: { id: true } })
                .then((rows) => rows.map((r) => r.id));
            canUpload = referredClientIds.includes(task.clientId);
        }
        if (!canUpload) {
            return res.status(403).json({ error: "Not authorized to add files to this task" });
        }
        // Auto-versioning: if a prior file with the same base name in this task
        // was NEEDS_REVISION or REJECTED, treat this upload as a new version of it.
        const uploadBaseName = path_1.default.parse(req.file.originalname).name.toLowerCase().trim();
        const existingFiles = await prisma_1.default.taskFile.findMany({
            where: { taskId: taskIdNum },
            select: { fileName: true, version: true, reviewStatus: true },
        });
        const related = existingFiles.filter((f) => {
            const fBase = path_1.default.parse(f.fileName).name.toLowerCase().trim();
            return fBase === uploadBaseName;
        });
        let newVersion = 1;
        if (related.length > 0) {
            const hadReview = related.some((f) => f.reviewStatus === "NEEDS_REVISION" || f.reviewStatus === "REJECTED");
            if (hadReview) {
                newVersion = Math.max(...related.map((f) => f.version)) + 1;
            }
        }
        // Determine channel visibility based on uploader role
        let fileVisibleToClient;
        if (role === "CLIENT") {
            fileVisibleToClient = true;
        }
        else if (role === "WORKER") {
            fileVisibleToClient = false;
        }
        else {
            // ADMIN/ERASPHERE: read from form body, default true (client channel)
            const bodyVal = req.body.visibleToClient;
            fileVisibleToClient = bodyVal === "false" || bodyVal === false ? false : true;
        }
        const file = await prisma_1.default.taskFile.create({
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
            const uploader = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { name: true } });
            const uploaderName = uploader?.name ?? "Someone";
            const threadType = fileVisibleToClient ? "client" : "internal";
            const link = `/tasks/${taskIdNum}`;
            const message = `${uploaderName} uploaded "${req.file.originalname}" to task "${task.title}"`;
            const adminUsers = await prisma_1.default.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
            const recipientIds = [];
            if (fileVisibleToClient) {
                if (role === "CLIENT") {
                    // Client uploaded → notify admins
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else {
                    // Admin uploaded to client channel → notify client
                    if (task.clientId)
                        recipientIds.push(task.clientId);
                }
            }
            else {
                if (role === "WORKER") {
                    // Worker uploaded → notify admins
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else {
                    // Admin uploaded to worker channel → notify workers
                    recipientIds.push(...task.workers.map((w) => w.userId));
                }
            }
            const finalRecipients = recipientIds.filter((uid) => uid !== userId);
            await Promise.all(finalRecipients.map((recipientId) => prisma_1.default.notification.create({
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
            })));
        }
        catch (err) {
            console.error("Failed to send file upload notification:", err);
        }
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
        const file = await prisma_1.default.taskFile.findFirst({
            where: {
                id: fileIdNum,
                taskId: taskIdNum
            }
        });
        if (!file) {
            return res.status(404).json({ error: "File not found or doesn't belong to this task" });
        }
        const task = await prisma_1.default.task.findUnique({
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
        }
        else if (role === "CLIENT") {
            if (Number(task.clientId) !== (0, clientScope_1.clientScopeId)(req.user)) {
                return res.status(403).json({ error: "Not authorized to comment on this task" });
            }
        }
        else if (role === "ERASPHERE") {
            const referred = await prisma_1.default.user.findMany({
                where: { role: "CLIENT", referredById: authUserId },
                select: { id: true },
            });
            if (task.clientId === null || !referred.some((c) => c.id === task.clientId)) {
                return res.status(403).json({ error: "Not authorized to comment on this task" });
            }
        }
        else if (role !== "ADMIN") {
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
        const comment = await prisma_1.default.fileComment.create({
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
        const commenterName = comment.user.name;
        const authorRole = comment.user?.role ?? "WORKER";
        // Channel-isolated notification routing (mirror task comments — the generic
        // emit() routing is channel-unaware and would notify the wrong side):
        //   Client channel  → client posts notify admins; admin posts notify the client
        //   Worker channel  → worker posts notify admins; admin posts notify task workers
        // An internal file comment must never notify the client, and a client-channel
        // file comment must never notify task workers.
        try {
            const adminUsers = await prisma_1.default.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
            const recipientIds = [];
            if (visibleToClient) {
                if (role === "CLIENT") {
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else if (task.clientId != null) {
                    recipientIds.push(task.clientId);
                }
            }
            else {
                if (role === "WORKER") {
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else {
                    recipientIds.push(...task.workers.map((w) => w.userId));
                }
            }
            const finalRecipients = recipientIds.filter((uid) => uid !== authUserId);
            await Promise.all(finalRecipients.map((userId) => prisma_1.default.notification.create({
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
            })));
        }
        catch (notifErr) {
            console.error("File comment notification failed (comment still saved):", notifErr?.message ?? notifErr);
        }
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
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskIdNum },
            include: { workers: { select: { userId: true } } },
        });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        if (role === "WORKER") {
            const canComment = task.workers.some((w) => w.userId === authUserId);
            if (!canComment)
                return res.status(403).json({ error: "Not authorized to comment on this task" });
        }
        if (role === "CLIENT" && Number(task.clientId) !== (0, clientScope_1.clientScopeId)(req.user)) {
            return res.status(403).json({ error: "Not authorized to comment on this task" });
        }
        if (role === "ERASPHERE") {
            const referred = await prisma_1.default.user.findMany({
                where: { role: "CLIENT", referredById: authUserId },
                select: { id: true },
            });
            if (task.clientId === null || !referred.some((c) => c.id === task.clientId)) {
                return res.status(403).json({ error: "Not authorized to comment on this task" });
            }
        }
        const visibleToClient = role === "CLIENT" ? true : (visibleToClientBody === true || visibleToClientBody === "true");
        const comment = await prisma_1.default.taskComment.create({
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
            const authorRole = comment.user && typeof comment.user.role === "string"
                ? comment.user.role
                : "WORKER";
            const realName = comment.user && typeof comment.user.name === "string"
                ? comment.user.name
                : "Someone";
            // Privacy: if a worker posts a client-visible comment, the client's
            // notification must show the codename, not the real name.
            const commenterName = authorRole === "WORKER" && visibleToClient ? (0, workerIdentity_1.workerAlias)(authUserId) : realName;
            // Channel-isolated notification routing:
            //   Client channel (visibleToClient=true):
            //     Client posts → notify admins only
            //     Admin posts  → notify client only
            //   Worker channel (visibleToClient=false):
            //     Worker posts → notify admins only
            //     Admin posts  → notify task workers only
            const taskWithWorkers = await prisma_1.default.task.findUnique({
                where: { id: taskIdNum },
                select: { clientId: true, workers: { select: { userId: true } } },
            });
            const adminUsers = await prisma_1.default.user.findMany({
                where: { role: "ADMIN" },
                select: { id: true },
            });
            const recipientIds = [];
            if (visibleToClient) {
                if (role === "CLIENT") {
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else {
                    if (taskWithWorkers?.clientId)
                        recipientIds.push(taskWithWorkers.clientId);
                }
            }
            else {
                if (role === "WORKER") {
                    recipientIds.push(...adminUsers.map((a) => a.id));
                }
                else {
                    recipientIds.push(...(taskWithWorkers?.workers.map((w) => w.userId) ?? []));
                }
            }
            const finalRecipients = recipientIds.filter((uid) => uid !== authUserId);
            await Promise.all(finalRecipients.map((userId) => prisma_1.default.notification.create({
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
            })));
        }
        catch (notifErr) {
            console.error("Notification failed (comment still saved):", notifErr?.message ?? notifErr);
        }
        res.status(201).json(comment);
    }
    catch (error) {
        const code = error?.code;
        const meta = error?.meta;
        console.error("Error adding comment:", {
            message: error?.message,
            code,
            meta,
            stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
        });
        if (code === "P2003")
            return res.status(400).json({ error: "Task not found or invalid." });
        if (code === "P2014")
            return res.status(400).json({ error: "Invalid reference." });
        const payload = { error: "Failed to add comment" };
        if (process.env.NODE_ENV !== "production" && error?.message)
            payload.details = error.message;
        res.status(500).json(payload);
    }
});
// delete an uploaded task file — admins delete any; everyone else only their own upload.
router.delete("/:taskId/files/:fileId", auth_1.verifyJWT, async (req, res) => {
    try {
        const fileId = Number(req.params.fileId);
        if (isNaN(fileId))
            return res.status(400).json({ error: "Invalid file id" });
        const { role, userId } = req.user;
        const file = await prisma_1.default.taskFile.findUnique({
            where: { id: fileId },
            select: { id: true, uploadedBy: true },
        });
        if (!file)
            return res.status(404).json({ error: "File not found" });
        if (role !== "ADMIN" && file.uploadedBy !== userId) {
            return res.status(403).json({ error: "You can only delete files you uploaded" });
        }
        await prisma_1.default.fileComment.deleteMany({ where: { fileId } });
        await prisma_1.default.taskFile.delete({ where: { id: fileId } });
        res.json({ message: "File deleted" });
    }
    catch (error) {
        if (error?.code === "P2025")
            return res.status(404).json({ error: "File not found" });
        console.error("Error deleting file:", error);
        res.status(500).json({ error: "Failed to delete file" });
    }
});
// delete a task comment — admins delete any; everyone else only their own.
router.delete("/:taskId/comments/:commentId", auth_1.verifyJWT, async (req, res) => {
    try {
        const commentId = Number(req.params.commentId);
        if (isNaN(commentId))
            return res.status(400).json({ error: "Invalid comment id" });
        const { role, userId } = req.user;
        const comment = await prisma_1.default.taskComment.findUnique({
            where: { id: commentId },
            select: { id: true, userId: true },
        });
        if (!comment)
            return res.status(404).json({ error: "Comment not found" });
        if (role !== "ADMIN" && comment.userId !== userId) {
            return res.status(403).json({ error: "You can only delete your own messages" });
        }
        await prisma_1.default.taskComment.delete({ where: { id: commentId } });
        res.json({ message: "Comment deleted" });
    }
    catch (error) {
        if (error?.code === "P2025")
            return res.status(404).json({ error: "Comment not found" });
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Failed to delete comment" });
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
        if (role === "ERASPHERE") {
            const referredIds = await getReferredClientIds(userId);
            if (existingTask.clientId === null || !referredIds.includes(existingTask.clientId)) {
                return res.status(403).json({ error: "Not authorized to update this task" });
            }
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
        // Reassigning the owning client or the worker roster is admin-only.
        if (role === "ADMIN") {
            if (clientId !== undefined)
                updateData.clientId = clientId;
            if (workerIds !== undefined && Array.isArray(workerIds)) {
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
            await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_ASSIGNED, {
                title: "New Task Assigned",
                message: `You have been assigned to task: "${updatedTask.title}"`,
                link: `/tasks/${taskId}`,
                taskId,
                actorId: req.user.userId,
            });
        }
        if (status && status !== existingTask.status) {
            if (status === "PENDING_APPROVAL") {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_PENDING_APPROVAL, {
                    title: "Task Pending Approval",
                    message: `Task "${updatedTask.title}" is pending your approval`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
            }
            else if (status === "COMPLETED") {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_COMPLETED, {
                    title: "Task Completed",
                    message: `Task "${updatedTask.title}" has been marked as completed`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
            }
            else {
                await (0, notificationEngine_1.emit)(notificationEngine_1.EventType.TASK_STATUS_CHANGED, {
                    title: "Task Status Updated",
                    message: `Task "${updatedTask.title}" status changed to ${status}`,
                    link: `/tasks/${taskId}`,
                    taskId,
                    actorId: req.user.userId,
                });
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
        const { role, userId } = req.user;
        if (role !== "ADMIN" && role !== "ERASPHERE") {
            return res.status(403).json({ error: "Only admins or EraSphere can delete tasks" });
        }
        const taskId = Number(req.params.id);
        if (!Number.isInteger(taskId)) {
            return res.status(400).json({ error: "Invalid task id" });
        }
        const task = await prisma_1.default.task.findUnique({ where: { id: taskId }, select: { clientId: true } });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        if (role === "ERASPHERE") {
            const referredIds = await getReferredClientIds(userId);
            if (task.clientId === null || !referredIds.includes(task.clientId)) {
                return res.status(403).json({ error: "Not authorized to delete this task" });
            }
        }
        await prisma_1.default.task.delete({ where: { id: taskId } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});
// PATCH /tasks/:taskId/files/:fileId/review — admin submits a review decision on a file
// POST /tasks/:taskId/files/:fileId/forward — admin clones a deliverable into the
// other channel (worker <-> client) so it doesn't have to be re-uploaded by hand.
router.post("/:taskId/files/:fileId/forward", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const taskId = Number(req.params.taskId);
        const fileId = Number(req.params.fileId);
        const { userId: adminId } = req.user;
        const toClient = Boolean(req.body.toClient);
        const src = await prisma_1.default.taskFile.findFirst({
            where: { id: fileId, taskId },
            include: { comments: { orderBy: { createdAt: "asc" } } },
        });
        if (!src)
            return res.status(404).json({ error: "File not found in this task" });
        // Reference the same file on disk; just a new row in the target channel.
        const clone = await prisma_1.default.taskFile.create({
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
            await prisma_1.default.fileComment.createMany({
                data: src.comments.map((c) => ({
                    fileId: clone.id,
                    userId: c.userId,
                    content: c.content,
                    visibleToClient: toClient,
                })),
            });
        }
        res.status(201).json(clone);
    }
    catch (error) {
        console.error("Error forwarding file:", error);
        res.status(500).json({ error: "Failed to forward file" });
    }
});
router.patch("/:taskId/files/:fileId/review", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
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
        const taskFile = await prisma_1.default.taskFile.findFirst({
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
        const updated = await prisma_1.default.taskFile.update({
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
        let uploaderMessage;
        let clientMessage;
        if (status === "APPROVED") {
            uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" was approved ✅`;
            clientMessage = `A file "${fileName}" on task "${taskTitle}" has been approved ✅`;
        }
        else if (status === "NEEDS_REVISION") {
            uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" needs revision — ${comment.trim()}`;
            clientMessage = `A file "${fileName}" on task "${taskTitle}" requires revision`;
        }
        else {
            uploaderMessage = `Your file "${fileName}" on task "${taskTitle}" was rejected — ${comment.trim()}`;
            clientMessage = `A file "${fileName}" on task "${taskTitle}" was rejected`;
        }
        // Notify the file uploader (usually the worker) if not the reviewing admin
        const recipientNotifications = [];
        if (taskFile.uploadedBy !== adminId) {
            recipientNotifications.push({ userId: taskFile.uploadedBy, message: uploaderMessage });
        }
        // Notify the task client ONLY for client-channel files. Internal (worker-channel)
        // files are not visible to the client, so a review of one must not leak to them.
        if (taskFile.visibleToClient && taskFile.task.clientId && taskFile.task.clientId !== adminId) {
            recipientNotifications.push({ userId: taskFile.task.clientId, message: clientMessage });
        }
        await Promise.all(recipientNotifications.map(({ userId, message }) => prisma_1.default.notification.create({
            data: {
                userId,
                type: "TASK_FILE_REVIEWED",
                title: "File Review Update",
                message,
                link,
                read: false,
            },
        })));
        res.json(updated);
    }
    catch (error) {
        console.error("Error submitting file review:", error);
        res.status(500).json({ error: "Failed to submit file review" });
    }
});
async function loadTaskForMilestone(taskId) {
    return prisma_1.default.task.findUnique({
        where: { id: taskId },
        select: { id: true, clientId: true, workers: { select: { userId: true } } },
    });
}
/** Can this user see/add milestones on the task? (admin, assigned worker, the
 *  task's client, or an EraSphere partner who referred the client.) */
async function canAccessMilestones(task, user) {
    if (user.role === "ADMIN")
        return true;
    if (user.role === "WORKER")
        return task.workers.some((w) => w.userId === user.userId);
    if (user.role === "CLIENT")
        return task.clientId === (0, clientScope_1.clientScopeId)(user);
    if (user.role === "ERASPHERE" && task.clientId) {
        return (await getReferredClientIds(user.userId)).includes(task.clientId);
    }
    return false;
}
/** Only admins and assigned workers can mark milestones done. */
function canCompleteMilestones(task, user) {
    return user.role === "ADMIN" || (user.role === "WORKER" && task.workers.some((w) => w.userId === user.userId));
}
// list milestones for a task
router.get("/:id/milestones", auth_1.verifyJWT, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        if (!Number.isInteger(taskId))
            return res.status(400).json({ error: "Invalid task id" });
        const task = await loadTaskForMilestone(taskId);
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        if (!(await canAccessMilestones(task, req.user))) {
            return res.status(403).json({ error: "Not authorized" });
        }
        const milestones = await prisma_1.default.milestone.findMany({
            where: { taskId },
            orderBy: [{ order: "asc" }, { id: "asc" }],
        });
        res.json(milestones);
    }
    catch (error) {
        console.error("Error listing milestones:", error);
        res.status(500).json({ error: "Failed to load to-dos" });
    }
});
// create a milestone (optional images). upload.any() accepts files under any
// field name ("images", "image", …) so an older cached client still works.
router.post("/:id/milestones", auth_1.verifyJWT, upload.any(), async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        if (!Number.isInteger(taskId))
            return res.status(400).json({ error: "Invalid task id" });
        const title = String(req.body.title || "").trim();
        if (!title)
            return res.status(400).json({ error: "Title is required" });
        const task = await loadTaskForMilestone(taskId);
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        if (!(await canAccessMilestones(task, req.user))) {
            return res.status(403).json({ error: "Not authorized to add to-dos to this task" });
        }
        const last = await prisma_1.default.milestone.findFirst({
            where: { taskId },
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const files = req.files || [];
        const milestone = await prisma_1.default.milestone.create({
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
                prisma_1.default.notification
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
    }
    catch (error) {
        console.error("Error creating milestone:", error);
        res.status(500).json({ error: "Failed to create to-do" });
    }
});
// add more images to an existing to-do
router.post("/:id/milestones/:mid/images", auth_1.verifyJWT, upload.any(), async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const mid = Number(req.params.mid);
        const task = await loadTaskForMilestone(taskId);
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        if (!(await canAccessMilestones(task, req.user)))
            return res.status(403).json({ error: "Not authorized" });
        const milestone = await prisma_1.default.milestone.findFirst({ where: { id: mid, taskId } });
        if (!milestone)
            return res.status(404).json({ error: "To-do not found" });
        const files = req.files || [];
        if (files.length === 0)
            return res.status(400).json({ error: "No images uploaded" });
        const updated = await prisma_1.default.milestone.update({
            where: { id: mid },
            data: { imageUrls: { push: files.map((f) => `/uploads/${f.filename}`) } },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error adding to-do images:", error);
        res.status(500).json({ error: "Failed to add images" });
    }
});
// remove one image from a to-do (admin or creator)
router.delete("/:id/milestones/:mid/images", auth_1.verifyJWT, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const mid = Number(req.params.mid);
        const { userId, role } = req.user;
        const url = String(req.body.url || "");
        const milestone = await prisma_1.default.milestone.findFirst({ where: { id: mid, taskId } });
        if (!milestone)
            return res.status(404).json({ error: "To-do not found" });
        if (role !== "ADMIN" && milestone.createdById !== userId) {
            return res.status(403).json({ error: "Not authorized to edit this to-do" });
        }
        const updated = await prisma_1.default.milestone.update({
            where: { id: mid },
            data: {
                imageUrls: (milestone.imageUrls || []).filter((u) => u !== url),
                imageUrl: milestone.imageUrl === url ? null : milestone.imageUrl,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Error removing to-do image:", error);
        res.status(500).json({ error: "Failed to remove image" });
    }
});
// update a milestone (toggle done by staff; edit title/description by staff or creator)
router.patch("/:id/milestones/:mid", auth_1.verifyJWT, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const mid = Number(req.params.mid);
        const { userId, role } = req.user;
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskId },
            select: { id: true, title: true, clientId: true, workers: { select: { userId: true } }, client: { select: { id: true, name: true, email: true } } },
        });
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        if (!(await canAccessMilestones(task, req.user))) {
            return res.status(403).json({ error: "Not authorized" });
        }
        const milestone = await prisma_1.default.milestone.findFirst({ where: { id: mid, taskId } });
        if (!milestone)
            return res.status(404).json({ error: "To-do not found" });
        const data = {};
        const isStaff = canCompleteMilestones(task, req.user);
        if ("title" in req.body || "description" in req.body) {
            if (!isStaff && milestone.createdById !== userId) {
                return res.status(403).json({ error: "You can only edit to-dos you created" });
            }
            if (typeof req.body.title === "string" && req.body.title.trim())
                data.title = req.body.title.trim().slice(0, 160);
            if ("description" in req.body)
                data.description = req.body.description ? String(req.body.description).trim() : null;
        }
        let justCompleted = false;
        // Stage toggles: Pushed to GitHub → Deployed (kept in order). A to-do is
        // "done" only once it's both pushed AND deployed.
        if ("pushedToGithub" in req.body || "deployed" in req.body) {
            if (!isStaff)
                return res.status(403).json({ error: "Only admins and assigned workers can update stages" });
            let pushed = milestone.pushedToGithub;
            let deployed = milestone.deployed;
            if ("pushedToGithub" in req.body) {
                pushed = !!req.body.pushedToGithub;
                if (!pushed)
                    deployed = false; // can't be deployed if it wasn't pushed
            }
            if ("deployed" in req.body) {
                deployed = !!req.body.deployed;
                if (deployed)
                    pushed = true; // deploying implies it was pushed
            }
            const newDone = pushed && deployed;
            data.pushedToGithub = pushed;
            data.deployed = deployed;
            data.isDone = newDone;
            data.doneAt = newDone ? new Date() : null;
            data.doneBy = newDone ? userId : null;
            justCompleted = newDone && !milestone.isDone;
        }
        else if (typeof req.body.isDone === "boolean") {
            // Legacy/direct done toggle — keep the stage flags consistent.
            if (!isStaff)
                return res.status(403).json({ error: "Only admins and assigned workers can complete to-dos" });
            data.isDone = req.body.isDone;
            data.deployed = req.body.isDone;
            if (req.body.isDone)
                data.pushedToGithub = true;
            data.doneAt = req.body.isDone ? new Date() : null;
            data.doneBy = req.body.isDone ? userId : null;
            justCompleted = req.body.isDone && !milestone.isDone;
        }
        if (Object.keys(data).length === 0)
            return res.status(400).json({ error: "Nothing to update" });
        const updated = await prisma_1.default.milestone.update({ where: { id: mid }, data });
        // Notify + email the client ONLY when every to-do is complete (100%),
        // not on each individual one.
        if (justCompleted) {
            const all = await prisma_1.default.milestone.findMany({ where: { taskId }, select: { isDone: true } });
            const total = all.length;
            const done = all.filter((m) => m.isDone).length;
            const allDone = total > 0 && done === total;
            const clientId = task.clientId;
            const client = task.client;
            if (allDone && clientId && clientId !== userId) {
                prisma_1.default.notification
                    .create({
                    data: {
                        userId: clientId,
                        type: "TASK_TODOS_COMPLETE",
                        title: "All to-dos complete",
                        message: `All to-dos are done on "${task.title}" — 100% complete 🎉`,
                        link: `/tasks/${taskId}`,
                        read: false,
                    },
                })
                    .catch((e) => console.error("Failed to-dos-complete notification:", e));
                if (client?.email) {
                    (0, milestoneEmail_1.sendMilestoneDoneEmail)({
                        to: client.email,
                        clientName: client.name,
                        taskId,
                        taskTitle: task.title,
                        done,
                        total,
                    }).catch((e) => console.error("Failed to-dos-complete email:", e));
                }
            }
        }
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating milestone:", error);
        res.status(500).json({ error: "Failed to update to-do" });
    }
});
// Request changes on a to-do stage: un-mark the stage (e.g. GitHub) and post a
// comment into the worker channel so the assigned workers know what to fix.
router.post("/:id/milestones/:mid/request-changes", auth_1.verifyJWT, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const mid = Number(req.params.mid);
        if (!Number.isInteger(taskId) || !Number.isInteger(mid)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const { userId } = req.user;
        const stage = String(req.body.stage || "");
        const comment = String(req.body.comment || "").trim();
        if (stage !== "pushedToGithub" && stage !== "deployed") {
            return res.status(400).json({ error: "stage must be 'pushedToGithub' or 'deployed'" });
        }
        const task = await prisma_1.default.task.findUnique({
            where: { id: taskId },
            select: { id: true, title: true, clientId: true, workers: { select: { userId: true } } },
        });
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        if (!canCompleteMilestones(task, req.user)) {
            return res.status(403).json({ error: "Only admins and assigned workers can request changes" });
        }
        const milestone = await prisma_1.default.milestone.findFirst({ where: { id: mid, taskId } });
        if (!milestone)
            return res.status(404).json({ error: "To-do not found" });
        // Roll back the requested stage (and anything downstream of it). Requesting
        // changes on GitHub also clears Deployed, since deploy sits on top of it.
        let pushed = milestone.pushedToGithub;
        let deployed = milestone.deployed;
        if (stage === "pushedToGithub") {
            pushed = false;
            deployed = false;
        }
        else {
            deployed = false;
        }
        const newDone = pushed && deployed;
        const updated = await prisma_1.default.milestone.update({
            where: { id: mid },
            data: {
                pushedToGithub: pushed,
                deployed,
                isDone: newDone,
                doneAt: newDone ? milestone.doneAt : null,
                doneBy: newDone ? milestone.doneBy : null,
            },
        });
        // Post the feedback into the worker channel (internal — never client-visible).
        const stageLabel = stage === "pushedToGithub" ? "GitHub" : "Deployed";
        const body = `🔁 Changes requested on to-do “${milestone.title}” (${stageLabel})${comment ? `:\n${comment}` : "."}`;
        await prisma_1.default.taskComment.create({
            data: { taskId, userId, content: body, visibleToClient: false },
        });
        // Notify the assigned workers (admins acting → workers; a worker acting →
        // the other workers). Never the client — this is an internal review note.
        const recipientIds = (task.workers.map((w) => w.userId)).filter((wid) => wid !== userId);
        if (recipientIds.length) {
            await prisma_1.default.notification
                .createMany({
                data: recipientIds.map((wid) => ({
                    userId: wid,
                    type: "TODO_CHANGES_REQUESTED",
                    title: `Changes requested (${stageLabel})`,
                    message: `“${milestone.title}” on ${task.title} needs changes${comment ? `: ${comment.slice(0, 120)}` : ""}`,
                    link: `/tasks/${taskId}`,
                    read: false,
                })),
            })
                .catch((e) => console.error("Failed changes-requested notification:", e));
        }
        res.json(updated);
    }
    catch (error) {
        console.error("Error requesting changes:", error);
        res.status(500).json({ error: "Failed to request changes" });
    }
});
// delete a milestone (admin or its creator)
router.delete("/:id/milestones/:mid", auth_1.verifyJWT, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const mid = Number(req.params.mid);
        const { userId, role } = req.user;
        const milestone = await prisma_1.default.milestone.findFirst({ where: { id: mid, taskId } });
        if (!milestone)
            return res.status(404).json({ error: "To-do not found" });
        if (role !== "ADMIN" && milestone.createdById !== userId) {
            return res.status(403).json({ error: "Not authorized to delete this to-do" });
        }
        await prisma_1.default.milestone.delete({ where: { id: mid } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting milestone:", error);
        res.status(500).json({ error: "Failed to delete to-do" });
    }
});
exports.default = router;
//# sourceMappingURL=tasks.js.map