"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET all tasks (filtered by role)
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        let tasks;
        if (role === "ADMIN") {
            // Admin sees all tasks with worker and client info
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
                    worker: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true
                        }
                    }
                }
            });
        }
        else if (role === "WORKER") {
            // Worker sees only their assigned tasks
            tasks = await prisma.task.findMany({
                where: { workerId: userId },
                include: {
                    client: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            company: true,
                            role: true
                        }
                    }
                }
            });
        }
        else if (role === "CLIENT") {
            // Client sees only their own tasks
            tasks = await prisma.task.findMany({
                where: { clientId: userId },
                include: {
                    worker: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true
                        }
                    }
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
// GET task by ID
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
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
                worker: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        // Authorization checks
        if (role === "WORKER" && task.workerId !== userId) {
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
// CREATE task (Admin only)
router.post("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can create tasks" });
        }
        const { title, description, clientId, workerId, status, dueDate } = req.body;
        // Validation
        if (!title || !clientId) {
            return res.status(400).json({ error: "Title and clientId are required" });
        }
        // Verify client exists and has CLIENT role
        const client = await prisma.user.findUnique({
            where: { id: clientId }
        });
        if (!client || client.role !== "CLIENT") {
            return res.status(400).json({ error: "Invalid client ID" });
        }
        // Verify worker exists and has WORKER role (if provided)
        if (workerId) {
            const worker = await prisma.user.findUnique({
                where: { id: workerId }
            });
            if (!worker || worker.role !== "WORKER") {
                return res.status(400).json({ error: "Invalid worker ID" });
            }
        }
        const taskData = {
            title,
            description: description || null,
            clientId,
            workerId: workerId || null,
            status: status || "PENDING",
        };
        if (dueDate) {
            taskData.dueDate = new Date(dueDate);
        }
        const task = await prisma.task.create({
            data: taskData,
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
                worker: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        res.status(201).json(task);
    }
    catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});
// UPDATE task
router.put("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const taskId = Number(req.params.id);
        const existingTask = await prisma.task.findUnique({
            where: { id: taskId }
        });
        if (!existingTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        // Authorization: Admin can update anything, Worker can update their own tasks
        if (role === "WORKER" && existingTask.workerId !== userId) {
            return res.status(403).json({ error: "Not authorized to update this task" });
        }
        if (role === "CLIENT") {
            return res.status(403).json({ error: "Clients cannot update tasks" });
        }
        const { title, description, status, dueDate, workerId, clientId } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (status !== undefined)
            updateData.status = status;
        if (dueDate !== undefined)
            updateData.dueDate = new Date(dueDate);
        // Only admin can reassign tasks
        if (role === "ADMIN") {
            if (workerId !== undefined)
                updateData.workerId = workerId;
            if (clientId !== undefined)
                updateData.clientId = clientId;
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
                worker: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        res.json(updatedTask);
    }
    catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
    }
});
// DELETE task (Admin only)
router.delete("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can delete tasks" });
        }
        await prisma.task.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});
exports.default = router;
//# sourceMappingURL=tasks.js.map