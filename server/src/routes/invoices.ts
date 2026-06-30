import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { emit, EventType } from "../services/notificationEngine";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";
import { clientScopeId } from "../lib/clientScope";

const router = Router();

/** Attach computed payment totals (amountPaid / remaining) from the payments list. */
function attachPayments<T extends { amount?: number | null; payments?: { amount: number }[] }>(inv: T) {
  const total = Number(inv.amount ?? 0);
  const amountPaid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
  return { ...inv, amountPaid, remaining: Math.max(0, Math.round((total - amountPaid) * 100) / 100) };
}

/** Recompute an invoice's status from its payments (PAID when fully covered). */
async function recomputeInvoiceStatus(invoiceId: number) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { amount: true, dueDate: true, payments: { select: { amount: true, paidAt: true } } },
  });
  if (!inv) return;
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const fullyPaid = paid >= Number(inv.amount || 0) - 0.001 && Number(inv.amount || 0) > 0;
  let status: string;
  let paidAt: Date | null = null;
  if (fullyPaid) {
    status = "PAID";
    paidAt = inv.payments.reduce((a, p) => (p.paidAt > a ? p.paidAt : a), inv.payments[0]?.paidAt ?? new Date());
  } else if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
    status = "OVERDUE";
  } else {
    status = "PENDING";
  }
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
}

const invoicesDir = path.join(uploadsDir, "invoices");
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "invoice-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadInvoice = multer({
  storage: invoiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function generateInvoiceNumber(): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
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
router.get("/", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    let invoices;

    // Optional ?clientId= filter (admin/EraSphere client detail page).
    const clientIdQ = Number(req.query.clientId);
    const filterClientId = Number.isInteger(clientIdQ) ? clientIdQ : null;

    if (role === "ADMIN") {
      invoices = await prisma.invoice.findMany({
        where: filterClientId !== null ? { clientId: filterClientId } : undefined,
        include: {
          client: { select: clientSelectWithContact },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "WORKER") {
      const tasks = await prisma.task.findMany({
        where: { workers: { some: { userId } } },
        select: { clientId: true }
      });
      const clientIds = [...new Set(tasks.map(t => t.clientId))];
      
      invoices = await prisma.invoice.findMany({ 
        where: { clientId: { in: clientIds } }, 
        include: { 
          client: { select: clientSelectWithContact },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "CLIENT") {
      invoices = await prisma.invoice.findMany({
        where: { clientId: clientScopeId(req.user) },
        include: {
          client: { select: clientSelectWithContact },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "ERASPHERE") {
      const referredClientIds = await prisma.user.findMany({
        where: { referredById: userId, role: "CLIENT" },
        select: { id: true },
      }).then((users) => users.map((u) => u.id));
      const scopedIds =
        filterClientId !== null
          ? referredClientIds.filter((cid) => cid === filterClientId)
          : referredClientIds;
      invoices = scopedIds.length
        ? await prisma.invoice.findMany({
            where: { clientId: { in: scopedIds } },
            include: {
              client: { select: clientSelectWithContact },
              lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [];
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    res.json(invoices.map(attachPayments));
  } catch (err) {
    console.error("Fetching invoices failed:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// get invoice id
router.get("/:id", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    const invoiceId = Number(req.params.id);
    if (!Number.isInteger(invoiceId)) {
      return res.status(400).json({ error: "Invalid invoice ID" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: clientSelectWithContact },
        lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (role === "WORKER") {
      const hasTask = await prisma.task.findFirst({
        where: {
          workers: { some: { userId } },
          clientId: invoice.clientId
        }
      });
      if (!hasTask) {
        return res.status(403).json({ error: "Not authorized to view this invoice" });
      }
    } else if (role === "CLIENT" && invoice.clientId !== clientScopeId(req.user)) {
      return res.status(403).json({ error: "Not authorized to view this invoice" });
    } else if (role === "ERASPHERE") {
      // Partners may only view invoices of clients they referred.
      const referred = await prisma.user.findMany({
        where: { referredById: userId, role: "CLIENT" },
        select: { id: true },
      });
      if (!referred.some((c) => c.id === invoice.clientId)) {
        return res.status(403).json({ error: "Not authorized to view this invoice" });
      }
    }

    res.json(attachPayments(invoice));
  } catch (err) {
    console.error("Fetching invoice failed:", err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// create invoice
router.post("/", verifyJWT, uploadInvoice.single("file"), async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create invoices" });
    }

    const { clientId, amount, dueDate, sendEmail, paymentLink, issueDate, paymentTerms, notes, taxRate, lineItems: lineItemsRaw } = req.body;

    if (!clientId || !dueDate) {
      return res.status(400).json({ error: "clientId and dueDate are required" });
    }

    const lineItems = typeof lineItemsRaw === "string" ? (JSON.parse(lineItemsRaw || "[]") as { name: string; description?: string; quantity: number; unitPrice: number }[]) : (lineItemsRaw || []);
    const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;

    let totalAmount: number;
    let subtotal: number | null = null;
    let taxAmount: number | null = null;
    let taxRateNum: number | null = null;

    if (hasLineItems) {
      const sub = lineItems.reduce((sum: number, li: { quantity: number; unitPrice: number }) => sum + Number(li.quantity) * Number(li.unitPrice), 0);
      subtotal = sub;
      taxRateNum = taxRate != null && taxRate !== "" ? parseFloat(String(taxRate)) : null;
      taxAmount = taxRateNum != null ? sub * (taxRateNum / 100) : 0;
      totalAmount = sub + (taxAmount || 0);
    } else {
      if (amount == null || amount === "") {
        return res.status(400).json({ error: "amount is required when there are no line items" });
      }
      totalAmount = parseFloat(amount);
    }

    const client = await prisma.user.findUnique({ 
      where: { id: Number(clientId) } 
    });
    
    if (!client || client.role !== "CLIENT") {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
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
          payments: { orderBy: { paidAt: 'asc' } },
      }
    });

    if (hasLineItems) {
      await prisma.invoiceLineItem.createMany({
        data: lineItems.map((li: { name: string; description?: string; quantity: number; unitPrice: number }, i: number) => ({
          invoiceId: invoice.id,
          name: String(li.name || "Item"),
          description: li.description != null ? String(li.description) : null,
          quantity: Number(li.quantity) || 0,
          unitPrice: Number(li.unitPrice) || 0,
          sortOrder: i,
        })),
      });
    }

    const invoiceWithLines = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        client: { select: clientSelectWithContact },
        lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
      }
    });

    await emit(EventType.INVOICE_CREATED, {
      title: "New Invoice",
      message: `Invoice ${invoiceNumber} for $${totalAmount.toFixed(2)} has been created`,
      link: "/dashboard",
      invoiceId: invoice.id,
      clientId: Number(clientId),
    });

    if (sendEmail === 'true') {
      try {
        const attachments = [];
        if (req.file) {
          const filePath = path.join(__dirname, '../../uploads/invoices', req.file.filename);
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
      } catch (emailError) {
        console.error("❌ Error sending payment request email:", emailError);
      }
    }

    res.status(201).json(attachPayments(invoiceWithLines ?? invoice));
  } catch (err) {
    console.error("Invoice creation failed:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// request payment
router.post("/:id/request-payment", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can send payment requests" });
    }

    const invoiceId = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: clientSelectWithContact },
        lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
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
        const filePath = path.join(__dirname, '../../uploads/invoices', filename!);
        
        if (fs.existsSync(filePath)) {
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
    } catch (emailError) {
      console.error("❌ Error sending payment reminder:", emailError);
      res.status(500).json({ error: "Failed to send payment request email" });
    }
  } catch (err) {
    console.error("Payment request failed:", err);
    res.status(500).json({ error: "Failed to send payment request" });
  }
});

// update invoice
router.put("/:id", verifyJWT, async (req: any, res) => {
  try {
    const { role } = req.user;
    
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update invoices" });
    }

    const invoiceId = Number(req.params.id);
    const { amount, dueDate, status, description, paidAt, paymentLink, issueDate, paymentTerms, notes, taxRate, lineItems: lineItemsRaw } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true },
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const lineItems = typeof lineItemsRaw === "string" ? (JSON.parse(lineItemsRaw || "[]") as { name: string; description?: string; quantity: number; unitPrice: number }[]) : (lineItemsRaw || []);
    const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;

    const updateData: any = {};
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (paymentLink !== undefined) updateData.paymentLink = paymentLink || null;
    if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms || null;
    if (notes !== undefined) updateData.notes = notes || null;

    if (hasLineItems) {
      const subtotal = lineItems.reduce((sum: number, li: { quantity: number; unitPrice: number }) => sum + Number(li.quantity) * Number(li.unitPrice), 0);
      const taxRateNum = taxRate != null && taxRate !== "" ? parseFloat(String(taxRate)) : null;
      const taxAmount = taxRateNum != null ? subtotal * (taxRateNum / 100) : 0;
      updateData.subtotal = subtotal;
      updateData.taxRate = taxRateNum;
      updateData.taxAmount = taxAmount;
      updateData.amount = subtotal + (taxAmount || 0);
    } else {
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (lineItemsRaw && Array.isArray(lineItems) && lineItems.length === 0) {
        updateData.subtotal = null;
        updateData.taxRate = null;
        updateData.taxAmount = null;
      }
    }

    if (status === "PAID" && !paidAt && !existingInvoice.paidAt) {
      updateData.paidAt = new Date();
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        client: { select: clientSelectWithContact },
        lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
      }
    });

    if (hasLineItems) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });
      await prisma.invoiceLineItem.createMany({
        data: lineItems.map((li: { name: string; description?: string; quantity: number; unitPrice: number }, i: number) => ({
          invoiceId,
          name: String(li.name || "Item"),
          description: li.description != null ? String(li.description) : null,
          quantity: Number(li.quantity) || 0,
          unitPrice: Number(li.unitPrice) || 0,
          sortOrder: i,
        })),
      });
    }

    const result = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: clientSelectWithContact },
        lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paidAt: 'asc' } },
      }
    });

    if (status === "PAID" && existingInvoice.status !== "PAID") {
      await emit(EventType.INVOICE_PAID, {
        title: "Invoice Paid",
        message: `Invoice ${result!.invoiceNumber} ($${result!.amount.toFixed(2)}) has been marked as paid`,
        link: "/dashboard",
        invoiceId: result!.id,
        clientId: result!.clientId,
      });
    }

    res.json(attachPayments(result ?? updatedInvoice));
  } catch (err) {
    console.error("Invoice update failed:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// delete invoice
router.delete("/:id", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can delete invoices" });
    }

    const invoiceId = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({ 
      where: { id: invoiceId } 
    });
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.fileUrl) {
      const filename = invoice.fileUrl.split('/').pop();
      const filePath = path.join(__dirname, '../../uploads/invoices', filename!);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    res.json({ success: true });
  } catch (err) {
    console.error("Invoice deletion failed:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// ---- Payments (admin records partial payments against an invoice) ----

// POST /invoices/:id/payments — record a payment
router.post("/:id/payments", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can record payments" });
    const invoiceId = Number(req.params.id);
    if (!Number.isInteger(invoiceId)) return res.status(400).json({ error: "Invalid invoice ID" });

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "A positive amount is required" });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    await prisma.payment.create({
      data: {
        invoiceId,
        amount: Math.round(amount * 100) / 100,
        paidAt: isNaN(paidAt.getTime()) ? new Date() : paidAt,
        note: req.body.note ? String(req.body.note).slice(0, 300) : null,
      },
    });
    await recomputeInvoiceStatus(invoiceId);

    const updated = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: clientSelectWithContact }, lineItems: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { paidAt: "asc" } } },
    });
    res.status(201).json(attachPayments(updated!));
  } catch (err) {
    console.error("Error recording payment:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// DELETE /invoices/:id/payments/:paymentId — remove a payment
router.delete("/:id/payments/:paymentId", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can edit payments" });
    const invoiceId = Number(req.params.id);
    const paymentId = Number(req.params.paymentId);
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, invoiceId } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    await prisma.payment.delete({ where: { id: paymentId } });
    await recomputeInvoiceStatus(invoiceId);

    const updated = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: clientSelectWithContact }, lineItems: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { paidAt: "asc" } } },
    });
    res.json(attachPayments(updated!));
  } catch (err) {
    console.error("Error deleting payment:", err);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

export default router;