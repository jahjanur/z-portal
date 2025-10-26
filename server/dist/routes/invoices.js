"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ---------------- GET ALL INVOICES ----------------
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        let invoices;
        if (role === "ADMIN") {
            // Admin sees all invoices
            invoices = await prisma.invoice.findMany({
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
        else if (role === "WORKER") {
            // Worker sees invoices for clients they have tasks with
            const tasks = await prisma.task.findMany({
                where: { workerId: userId },
                select: { clientId: true }
            });
            const clientIds = [...new Set(tasks.map(t => t.clientId))]; // unique client IDs
            invoices = await prisma.invoice.findMany({
                where: { clientId: { in: clientIds } },
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
            // Client sees only their own invoices
            invoices = await prisma.invoice.findMany({
                where: { clientId: userId },
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
        else {
            return res.status(403).json({ error: "Invalid role" });
        }
        res.json(invoices);
    }
    catch (err) {
        console.error("Fetching invoices failed:", err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});
// ---------------- GET INVOICE BY ID ----------------
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const invoiceId = Number(req.params.id);
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
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
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        // Authorization checks
        if (role === "WORKER") {
            // Check if worker has tasks with this client
            const hasTask = await prisma.task.findFirst({
                where: {
                    workerId: userId,
                    clientId: invoice.clientId
                }
            });
            if (!hasTask) {
                return res.status(403).json({ error: "Not authorized to view this invoice" });
            }
        }
        else if (role === "CLIENT" && invoice.clientId !== userId) {
            return res.status(403).json({ error: "Not authorized to view this invoice" });
        }
        res.json(invoice);
    }
    catch (err) {
        console.error("Fetching invoice failed:", err);
        res.status(500).json({ error: "Failed to fetch invoice" });
    }
});
// ---------------- CREATE INVOICE ----------------
router.post("/", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can create invoices" });
        }
        const { clientId, amount, dueDate, invoiceNumber, description } = req.body;
        // Validation
        if (!clientId || !amount || !dueDate || !invoiceNumber) {
            return res.status(400).json({ error: "clientId, amount, dueDate, and invoiceNumber are required" });
        }
        // Check if client exists and has CLIENT role
        const client = await prisma.user.findUnique({
            where: { id: Number(clientId) }
        });
        if (!client || client.role !== "CLIENT") {
            return res.status(400).json({ error: "Invalid client ID" });
        }
        // Check if invoice number already exists
        const existingInvoice = await prisma.invoice.findFirst({
            where: { invoiceNumber }
        });
        if (existingInvoice) {
            return res.status(400).json({ error: "Invoice number already exists" });
        }
        const invoice = await prisma.invoice.create({
            data: {
                clientId: Number(clientId),
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                invoiceNumber,
                description: description || null,
                status: "PENDING",
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
                }
            }
        });
        res.status(201).json(invoice);
    }
    catch (err) {
        console.error("Invoice creation failed:", err);
        res.status(500).json({ error: "Failed to create invoice" });
    }
});
// ---------------- UPDATE INVOICE ----------------
router.put("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can update invoices" });
        }
        const invoiceId = Number(req.params.id);
        const { amount, dueDate, status, description, paidAt } = req.body;
        const existingInvoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });
        if (!existingInvoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        const updateData = {};
        if (amount !== undefined)
            updateData.amount = parseFloat(amount);
        if (dueDate !== undefined)
            updateData.dueDate = new Date(dueDate);
        if (status !== undefined)
            updateData.status = status;
        if (description !== undefined)
            updateData.description = description;
        if (paidAt !== undefined)
            updateData.paidAt = paidAt ? new Date(paidAt) : null;
        // If status is being set to PAID and paidAt is not provided, set it to now
        if (status === "PAID" && !paidAt && !existingInvoice.paidAt) {
            updateData.paidAt = new Date();
        }
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
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
                }
            }
        });
        res.json(updatedInvoice);
    }
    catch (err) {
        console.error("Invoice update failed:", err);
        res.status(500).json({ error: "Failed to update invoice" });
    }
});
// ---------------- DELETE INVOICE ----------------
router.delete("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can delete invoices" });
        }
        const invoiceId = Number(req.params.id);
        const invoiceExists = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });
        if (!invoiceExists) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        await prisma.invoice.delete({ where: { id: invoiceId } });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Invoice deletion failed:", err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});
exports.default = router;
//# sourceMappingURL=invoices.js.map