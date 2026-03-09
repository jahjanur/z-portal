"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const notifications_1 = require("../services/notifications");
const notificationStore_1 = require("../services/notificationStore");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
const invoicesDir = "uploads/invoices";
if (!fs_1.default.existsSync(invoicesDir)) {
    fs_1.default.mkdirSync(invoicesDir, { recursive: true });
}
const invoiceStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, invoicesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "invoice-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const uploadInvoice = (0, multer_1.default)({
    storage: invoiceStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function generateInvoiceNumber() {
    const lastInvoice = await prisma_1.default.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true }
    });
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1]) + 1;
        }
    }
    return `INV-${nextNumber.toString().padStart(4, '0')}`;
}
const clientSelectWithContact = {
    id: true,
    email: true,
    name: true,
    company: true,
    role: true,
    phoneNumber: true,
    postalAddress: true,
    address: true,
};
// get all invoices
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        let invoices;
        if (role === "ADMIN") {
            invoices = await prisma_1.default.invoice.findMany({
                include: {
                    client: { select: clientSelectWithContact },
                    lineItems: { orderBy: { sortOrder: 'asc' } },
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        else if (role === "WORKER") {
            const tasks = await prisma_1.default.task.findMany({
                where: { workers: { some: { userId } } },
                select: { clientId: true }
            });
            const clientIds = [...new Set(tasks.map(t => t.clientId))];
            invoices = await prisma_1.default.invoice.findMany({
                where: { clientId: { in: clientIds } },
                include: {
                    client: { select: clientSelectWithContact },
                    lineItems: { orderBy: { sortOrder: 'asc' } },
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        else if (role === "CLIENT") {
            invoices = await prisma_1.default.invoice.findMany({
                where: { clientId: userId },
                include: {
                    client: { select: clientSelectWithContact },
                    lineItems: { orderBy: { sortOrder: 'asc' } },
                },
                orderBy: { createdAt: 'desc' }
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
// get invoice id
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const invoiceId = Number(req.params.id);
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (role === "WORKER") {
            const hasTask = await prisma_1.default.task.findFirst({
                where: {
                    workers: { some: { userId } },
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
// create invoice
router.post("/", auth_1.verifyJWT, uploadInvoice.single("file"), async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can create invoices" });
        }
        const { clientId, amount, dueDate, sendEmail, paymentLink, issueDate, paymentTerms, notes, taxRate, lineItems: lineItemsRaw } = req.body;
        if (!clientId || !dueDate) {
            return res.status(400).json({ error: "clientId and dueDate are required" });
        }
        const lineItems = typeof lineItemsRaw === "string" ? JSON.parse(lineItemsRaw || "[]") : (lineItemsRaw || []);
        const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;
        let totalAmount;
        let subtotal = null;
        let taxAmount = null;
        let taxRateNum = null;
        if (hasLineItems) {
            subtotal = lineItems.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unitPrice), 0);
            taxRateNum = taxRate != null && taxRate !== "" ? parseFloat(String(taxRate)) : null;
            taxAmount = taxRateNum != null ? subtotal * (taxRateNum / 100) : 0;
            totalAmount = subtotal + (taxAmount || 0);
        }
        else {
            if (amount == null || amount === "") {
                return res.status(400).json({ error: "amount is required when there are no line items" });
            }
            totalAmount = parseFloat(amount);
        }
        const client = await prisma_1.default.user.findUnique({
            where: { id: Number(clientId) }
        });
        if (!client || client.role !== "CLIENT") {
            return res.status(400).json({ error: "Invalid client ID" });
        }
        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await prisma_1.default.invoice.create({
            data: {
                clientId: Number(clientId),
                amount: totalAmount,
                dueDate: new Date(dueDate),
                invoiceNumber,
                fileUrl: req.file ? `/uploads/invoices/${req.file.filename}` : null,
                paymentLink: paymentLink || null,
                status: "PENDING",
                issueDate: issueDate ? new Date(issueDate) : null,
                paymentTerms: paymentTerms || null,
                notes: notes || null,
                subtotal: subtotal,
                taxRate: taxRateNum,
                taxAmount: taxAmount,
                ...(hasLineItems ? {} : { description: req.body.description || null }),
            },
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        if (hasLineItems) {
            await prisma_1.default.invoiceLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    invoiceId: invoice.id,
                    name: String(li.name || "Item"),
                    description: li.description != null ? String(li.description) : null,
                    quantity: Number(li.quantity) || 0,
                    unitPrice: Number(li.unitPrice) || 0,
                    sortOrder: i,
                })),
            });
        }
        const invoiceWithLines = await prisma_1.default.invoice.findUnique({
            where: { id: invoice.id },
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        // In-app notification for the client
        await (0, notificationStore_1.createNotification)(Number(clientId), "INVOICE_CREATED", "New Invoice", `Invoice ${invoiceNumber} for $${totalAmount.toFixed(2)} has been created`, "/dashboard");
        if (sendEmail === 'true') {
            try {
                const attachments = [];
                if (req.file) {
                    const filePath = path_1.default.join(__dirname, '../../uploads/invoices', req.file.filename);
                    attachments.push({
                        filename: req.file.originalname,
                        path: filePath
                    });
                }
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: client.email,
                    subject: `Payment Request - Invoice ${invoiceNumber}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #5B4FFF;">Payment Request</h2>
              <p>Dear ${client.name},</p>
              <p>You have received a new invoice for payment.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount:</strong> $${totalAmount.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
              </div>
              
              ${paymentLink ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentLink}" style="display: inline-block; padding: 12px 30px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Now</a>
                </div>
              ` : ''}
              
              ${attachments.length > 0 ? '<p>Please find the invoice attached to this email.</p>' : ''}
              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p style="margin-top: 30px;">Best regards,<br>Your Company Name</p>
            </div>
          `,
                    attachments
                });
                console.log(`✅ Payment request email sent to ${client.email} for invoice ${invoiceNumber}`);
            }
            catch (emailError) {
                console.error("❌ Error sending payment request email:", emailError);
            }
        }
        else {
            await (0, notifications_1.notifyNewInvoice)(invoiceWithLines ?? invoice, { email: client.email, name: client.name });
        }
        res.status(201).json(invoiceWithLines ?? invoice);
    }
    catch (err) {
        console.error("Invoice creation failed:", err);
        res.status(500).json({ error: "Failed to create invoice" });
    }
});
// request payment
router.post("/:id/request-payment", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can send payment requests" });
        }
        const invoiceId = Number(req.params.id);
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (invoice.status === "PAID") {
            return res.status(400).json({ error: "Invoice is already paid" });
        }
        try {
            const attachments = [];
            if (invoice.fileUrl) {
                const filename = invoice.fileUrl.split('/').pop();
                const filePath = path_1.default.join(__dirname, '../../uploads/invoices', filename);
                if (fs_1.default.existsSync(filePath)) {
                    attachments.push({
                        filename: filename,
                        path: filePath
                    });
                }
            }
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: invoice.client.email,
                subject: `Payment Reminder - Invoice ${invoice.invoiceNumber}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5B4FFF;">Payment Reminder</h2>
            <p>Dear ${invoice.client.name},</p>
            <p>This is a friendly reminder about your pending invoice.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            
            ${invoice.paymentLink ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoice.paymentLink}" style="display: inline-block; padding: 12px 30px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Now</a>
              </div>
            ` : ''}
            
            ${attachments.length > 0 ? '<p>Please find the invoice attached to this email.</p>' : ''}
            <p>If you have any questions, please don\'t hesitate to contact us.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>Your Company Name</p>
          </div>
        `,
                attachments
            });
            console.log(`✅ Payment reminder sent to ${invoice.client.email} for invoice ${invoice.invoiceNumber}`);
            res.json({ success: true, message: "Payment request sent successfully" });
        }
        catch (emailError) {
            console.error("❌ Error sending payment reminder:", emailError);
            res.status(500).json({ error: "Failed to send payment request email" });
        }
    }
    catch (err) {
        console.error("Payment request failed:", err);
        res.status(500).json({ error: "Failed to send payment request" });
    }
});
// update invoice
router.put("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can update invoices" });
        }
        const invoiceId = Number(req.params.id);
        const { amount, dueDate, status, description, paidAt, paymentLink, issueDate, paymentTerms, notes, taxRate, lineItems: lineItemsRaw } = req.body;
        const existingInvoice = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: { lineItems: true },
        });
        if (!existingInvoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        const lineItems = typeof lineItemsRaw === "string" ? JSON.parse(lineItemsRaw || "[]") : (lineItemsRaw || []);
        const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;
        const updateData = {};
        if (dueDate !== undefined)
            updateData.dueDate = new Date(dueDate);
        if (status !== undefined)
            updateData.status = status;
        if (description !== undefined)
            updateData.description = description;
        if (paidAt !== undefined)
            updateData.paidAt = paidAt ? new Date(paidAt) : null;
        if (paymentLink !== undefined)
            updateData.paymentLink = paymentLink || null;
        if (issueDate !== undefined)
            updateData.issueDate = issueDate ? new Date(issueDate) : null;
        if (paymentTerms !== undefined)
            updateData.paymentTerms = paymentTerms || null;
        if (notes !== undefined)
            updateData.notes = notes || null;
        if (hasLineItems) {
            const subtotal = lineItems.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unitPrice), 0);
            const taxRateNum = taxRate != null && taxRate !== "" ? parseFloat(String(taxRate)) : null;
            const taxAmount = taxRateNum != null ? subtotal * (taxRateNum / 100) : 0;
            updateData.subtotal = subtotal;
            updateData.taxRate = taxRateNum;
            updateData.taxAmount = taxAmount;
            updateData.amount = subtotal + (taxAmount || 0);
        }
        else {
            if (amount !== undefined)
                updateData.amount = parseFloat(amount);
            if (lineItemsRaw && Array.isArray(lineItems) && lineItems.length === 0) {
                updateData.subtotal = null;
                updateData.taxRate = null;
                updateData.taxAmount = null;
            }
        }
        if (status === "PAID" && !paidAt && !existingInvoice.paidAt) {
            updateData.paidAt = new Date();
        }
        const updatedInvoice = await prisma_1.default.invoice.update({
            where: { id: invoiceId },
            data: updateData,
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        if (hasLineItems) {
            await prisma_1.default.invoiceLineItem.deleteMany({ where: { invoiceId } });
            await prisma_1.default.invoiceLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    invoiceId,
                    name: String(li.name || "Item"),
                    description: li.description != null ? String(li.description) : null,
                    quantity: Number(li.quantity) || 0,
                    unitPrice: Number(li.unitPrice) || 0,
                    sortOrder: i,
                })),
            });
        }
        const result = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: clientSelectWithContact },
                lineItems: { orderBy: { sortOrder: 'asc' } },
            }
        });
        if (status === 'PAID' && existingInvoice.status !== 'PAID') {
            await (0, notifications_1.notifyInvoicePaid)(result, {
                email: result.client.email,
                name: result.client.name
            });
            // Notify client that invoice is paid
            await (0, notificationStore_1.createNotification)(result.clientId, "INVOICE_PAID", "Invoice Paid", `Invoice ${result.invoiceNumber} has been marked as paid`, "/dashboard");
            // Notify admins
            const admins = await prisma_1.default.user.findMany({ where: { role: "ADMIN" } });
            for (const admin of admins) {
                await (0, notificationStore_1.createNotification)(admin.id, "INVOICE_PAID", "Invoice Paid", `Invoice ${result.invoiceNumber} ($${result.amount.toFixed(2)}) has been paid`, "/admin/invoices");
            }
        }
        res.json(result ?? updatedInvoice);
    }
    catch (err) {
        console.error("Invoice update failed:", err);
        res.status(500).json({ error: "Failed to update invoice" });
    }
});
// delete invoice
router.delete("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can delete invoices" });
        }
        const invoiceId = Number(req.params.id);
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId }
        });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        if (invoice.fileUrl) {
            const filename = invoice.fileUrl.split('/').pop();
            const filePath = path_1.default.join(__dirname, '../../uploads/invoices', filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await prisma_1.default.invoice.delete({ where: { id: invoiceId } });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Invoice deletion failed:", err);
        res.status(500).json({ error: "Failed to delete invoice" });
    }
});
exports.default = router;
//# sourceMappingURL=invoices.js.map