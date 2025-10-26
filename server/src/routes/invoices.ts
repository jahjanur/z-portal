import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyJWT } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { notifyNewInvoice, notifyInvoicePaid } from "../services/notifications";

const router = Router();
const prisma = new PrismaClient();

const invoicesDir = "uploads/invoices";
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

// get all invoices
router.get("/", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    let invoices;

    if (role === "ADMIN") {
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
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "WORKER") {
      const tasks = await prisma.task.findMany({
        where: { workerId: userId },
        select: { clientId: true }
      });
      const clientIds = [...new Set(tasks.map(t => t.clientId))];
      
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
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "CLIENT") {
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
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    res.json(invoices);
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

    if (role === "WORKER") {
      const hasTask = await prisma.task.findFirst({
        where: {
          workerId: userId,
          clientId: invoice.clientId
        }
      });
      if (!hasTask) {
        return res.status(403).json({ error: "Not authorized to view this invoice" });
      }
    } else if (role === "CLIENT" && invoice.clientId !== userId) {
      return res.status(403).json({ error: "Not authorized to view this invoice" });
    }

    res.json(invoice);
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

    const { clientId, amount, dueDate, sendEmail, paymentLink } = req.body;

    if (!clientId || !amount || !dueDate) {
      return res.status(400).json({ error: "clientId, amount, and dueDate are required" });
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
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        invoiceNumber,
        fileUrl: req.file ? `/uploads/invoices/${req.file.filename}` : null,
        paymentLink: paymentLink || null,
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
                <p><strong>Amount:</strong> $${parseFloat(amount).toFixed(2)}</p>
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
    } else {
      await notifyNewInvoice(invoice, { email: client.email, name: client.name });
    }

    res.status(201).json(invoice);
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
    const { amount, dueDate, status, description, paidAt, paymentLink } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (paymentLink !== undefined) updateData.paymentLink = paymentLink || null;

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

    if (status === 'PAID' && existingInvoice.status !== 'PAID') {
      await notifyInvoicePaid(updatedInvoice, {
        email: updatedInvoice.client.email,
        name: updatedInvoice.client.name
      });
    }

    res.json(updatedInvoice);
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

export default router;