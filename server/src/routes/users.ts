import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyJWT, verifyAdmin, verifyAdminOrEraSphere } from "../middleware/auth";
import { notifyProfileCompleted } from "../services/notifications";
import { emit, EventType } from "../services/notificationEngine";
import prisma from "../lib/prisma";
import { uploadsDir } from "../lib/uploadsPath";
import { clientScopeId } from "../lib/clientScope";
import { sanitizeNickname, sanitizeEmoji, sanitizeSkills } from "../constants/workerProfile";

const router = Router();
const SALT_ROUNDS = 10;

/** Sum of payments recorded against an invoice (partial-payment aware). */
const paidOf = (inv: { payments: { amount: number }[] }) => inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

const filesDir = path.join(uploadsDir, "files");
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
    cb(null, "file-" + uniqueSuffix + "-" + sanitizedName);
  },
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
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

// get all users (admin sees all; EraSphere sees only clients they referred)
router.get("/", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    // Exclude company team members (companyOwnerId set) from the main lists —
    // they show under their company's "Team members" section, not as their own row.
    const whereClause =
      role === "ERASPHERE"
        ? { role: "CLIENT" as const, referredById: userId, companyOwnerId: null }
        : { companyOwnerId: null };
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        nickname: true,
        avatarEmoji: true,
        skills: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        postalAddress: true,
        address: true,
        phoneNumber: true,
        referredById: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// List the team members (extra founders) linked to a company. Admin only.
router.get("/:id/team-members", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const companyId = Number(req.params.id);
    if (!Number.isInteger(companyId)) return res.status(400).json({ error: "Invalid id" });
    const members = await prisma.user.findMany({
      where: { companyOwnerId: companyId },
      select: { id: true, name: true, email: true, profileStatus: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  } catch (error) {
    console.error("Error listing team members:", error);
    res.status(500).json({ error: "Failed to load team members" });
  }
});

// A CLIENT lists their own company's collaborators (team members).
router.get("/my-team-members", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "CLIENT") return res.status(403).json({ error: "Not authorized" });
    const companyId = clientScopeId(req.user);
    // Everyone on the company except the caller themselves.
    const members = await prisma.user.findMany({
      where: { OR: [{ companyOwnerId: companyId }, { id: companyId }], NOT: { id: req.user.userId } },
      select: { id: true, name: true, email: true, profileStatus: true, createdAt: true, companyOwnerId: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  } catch (error) {
    console.error("Error listing collaborators:", error);
    res.status(500).json({ error: "Failed to load collaborators" });
  }
});

// A CLIENT removes a collaborator from their own company.
router.delete("/my-team-members/:id", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "CLIENT") return res.status(403).json({ error: "Not authorized" });
    const targetId = Number(req.params.id);
    const companyId = clientScopeId(req.user);
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, companyOwnerId: true, role: true } });
    // Can only remove an actual member of the caller's own company (not the primary, not self).
    if (!target || target.role !== "CLIENT" || target.companyOwnerId !== companyId || target.id === req.user.userId) {
      return res.status(403).json({ error: "Not allowed to remove this user" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.fileComment.deleteMany({ where: { userId: targetId } });
      await tx.taskComment.deleteMany({ where: { userId: targetId } });
      await tx.notification.deleteMany({ where: { userId: targetId } });
      await tx.notificationPreference.deleteMany({ where: { userId: targetId } });
      await tx.user.delete({ where: { id: targetId } });
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    res.status(500).json({ error: "Failed to remove collaborator" });
  }
});

// Self-service: the logged-in user updates their own display profile
// (nickname / emoji / skills). Used by the onboarding + settings screens.
router.patch("/me/profile", verifyJWT, async (req: any, res) => {
  try {
    const { userId } = req.user;
    const data: any = {};
    if ("nickname" in req.body) data.nickname = sanitizeNickname(req.body.nickname) ?? null;
    if ("avatarEmoji" in req.body) data.avatarEmoji = sanitizeEmoji(req.body.avatarEmoji) ?? null;
    if ("skills" in req.body) data.skills = sanitizeSkills(req.body.skills);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No profile fields provided" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, role: true, name: true,
        nickname: true, avatarEmoji: true, skills: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating own profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// get EraSphere partners (admin only) with stats: clientsCount, tasksCount
router.get("/erasphere", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const partners = await prisma.user.findMany({
      where: { role: "ERASPHERE" },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        createdAt: true,
        profileStatus: true,
      },
    });

    const partnersWithStats = await Promise.all(
      partners.map(async (p) => {
        const referredClients = await prisma.user.findMany({
          where: { role: "CLIENT", referredById: p.id },
          select: { id: true },
        });
        const clientIds = referredClients.map((c) => c.id);
        const tasksCount =
          clientIds.length === 0
            ? 0
            : await prisma.task.count({
                where: { clientId: { in: clientIds } },
              });
        return {
          ...p,
          clientsCount: clientIds.length,
          tasksCount,
        };
      })
    );

    res.json(partnersWithStats);
  } catch (error) {
    console.error("Error fetching EraSphere partners:", error);
    res.status(500).json({ error: "Failed to fetch EraSphere partners" });
  }
});

// admin-only: aggregate EraSphere analytics (all partners, their clients, tasks, revenue)
router.get("/erasphere/admin-analytics", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const partners = await prisma.user.findMany({
      where: { role: "ERASPHERE" },
      select: { id: true },
    });
    const partnerIds = partners.map((p) => p.id);

    const erasphereClients = await prisma.user.findMany({
      where: { role: "CLIENT", referredById: { in: partnerIds } },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
        profileStatus: true,
        referredById: true,
      },
    });
    const clientIds = erasphereClients.map((c) => c.id);

    const [tasks, projects, invoices] = await Promise.all([
      prisma.task.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, title: true, status: true, clientId: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, name: true, status: true, clientId: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, amount: true, status: true, clientId: true, createdAt: true, invoiceNumber: true, paidAt: true, payments: { select: { amount: true } } },
      }),
    ]);

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidRevenue = invoices.reduce((sum, inv) => sum + paidOf(inv), 0);
    // Outstanding = what's still owed across all invoices (partial-payment aware).
    const pendingRevenue = invoices.reduce((sum, inv) => sum + Math.max(0, inv.amount - paidOf(inv)), 0);

    res.json({
      clients: erasphereClients,
      tasks,
      projects,
      invoices,
      stats: {
        totalPartners: partnerIds.length,
        totalClients: erasphereClients.length,
        totalTasks: tasks.length,
        activeTasks: tasks.filter((t) => t.status !== "COMPLETED").length,
        completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
        totalProjects: projects.length,
        totalRevenue,
        paidRevenue,
        pendingRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching EraSphere admin analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// get EraSphere member analytics (own clients, projects, tasks, invoice totals)
router.get("/erasphere/analytics", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    if (role !== "ERASPHERE") {
      return res.status(403).json({ error: "Only EraSphere members can access this" });
    }

    const myClients = await prisma.user.findMany({
      where: { role: "CLIENT", referredById: userId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
        profileStatus: true,
      },
    });

    const clientIds = myClients.map((c) => c.id);

    const [tasks, projects, invoices] = await Promise.all([
      prisma.task.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, title: true, status: true, clientId: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, name: true, status: true, clientId: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, amount: true, status: true, clientId: true, createdAt: true, invoiceNumber: true, paidAt: true, payments: { select: { amount: true } } },
      }),
    ]);

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidRevenue = invoices.reduce((sum, inv) => sum + paidOf(inv), 0);
    // Outstanding = what's still owed across all invoices (partial-payment aware).
    const pendingRevenue = invoices.reduce((sum, inv) => sum + Math.max(0, inv.amount - paidOf(inv)), 0);

    res.json({
      clients: myClients,
      tasks,
      projects,
      invoices,
      stats: {
        totalClients: myClients.length,
        totalTasks: tasks.length,
        activeTasks: tasks.filter((t) => t.status !== "COMPLETED").length,
        completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
        totalProjects: projects.length,
        totalRevenue,
        paidRevenue,
        pendingRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching EraSphere analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// get user invite token
router.get("/by-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        logo: true,
        address: true,
        postalAddress: true,
        phoneNumber: true,
        extraEmails: true,
        brandPattern: true,
        shortInfo: true,
        inviteExpires: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid token" });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return res.status(400).json({ error: "Token has expired" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user by token:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// post resend invite email
router.post("/:id/resend-invite", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user || (user.role !== "CLIENT" && user.role !== "ERASPHERE")) {
      return res.status(404).json({ error: "User not found" });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { inviteToken, inviteExpires },
    });

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/complete-profile?token=${inviteToken}`;
    const isEraSphere = user.role === "ERASPHERE";
    const emailSubject = isEraSphere
      ? 'Complete Your EraSphere Profile - Reminder'
      : 'Complete Your Company Profile - Reminder';
    const emailBody = isEraSphere
      ? 'This is a reminder to complete your EraSphere partner profile:'
      : 'This is a reminder to complete your company profile:';

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: emailSubject,
        html: `
          <h2>Hi ${user.name}!</h2>
          <p>${emailBody}</p>
          <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
          <p>This link will expire in 7 days.</p>
        `,
      });
      console.log(`✅ Invite email sent to ${user.email}`);
      res.json({ message: 'Invite email sent successfully' });
    } catch (emailError) {
      console.error("❌ Error sending email:", emailError);
      res.status(500).json({ error: 'Failed to send invite email' });
    }
  } catch (error) {
    console.error("Error resending invite:", error);
    res.status(500).json({ error: "Failed to resend invite" });
  }
});

// get user by id (admin: any; EraSphere: only their referred clients)
router.get("/:id", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const requestedId = Number(req.params.id);
    if (!Number.isInteger(requestedId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await prisma.user.findUnique({
      where: { id: requestedId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        address: true,
        postalAddress: true,
        phoneNumber: true,
        extraEmails: true,
        brandPattern: true,
        shortInfo: true,
        referredById: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (req.user?.role === "ERASPHERE") {
      if (user.role !== "CLIENT" || user.referredById !== req.user.userId) {
        return res.status(403).json({ error: "You can only view clients you referred" });
      }
    }

    const { referredById, ...rest } = user;
    res.json(rest);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// create user (admin can create any role; EraSphere can create CLIENT only)
router.post("/", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { 
      email, 
      password, 
      role, 
      name, 
      company, 
      logo, 
      colorHex, 
      postalAddress,
      domainName,
      domainExpiry,
      hostingPlan,
      hostingExpiry,
    } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: "Email, password, role, and name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const reqRole = req.user?.role;
    const bodyRole = (role || "").toUpperCase();
    if (reqRole !== "ADMIN" && bodyRole !== "CLIENT") {
      return res.status(403).json({ error: "Only admins can create workers or EraSphere partners" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const roleNormalized = bodyRole;

    if (!["ADMIN", "WORKER", "CLIENT", "ERASPHERE"].includes(roleNormalized)) {
      return res.status(400).json({ error: "Invalid role. Must be ADMIN, WORKER, CLIENT, or ERASPHERE" });
    }

    let inviteToken = null;
    let inviteExpires = null;
    
    if (roleNormalized === "CLIENT" || roleNormalized === "ERASPHERE") {
      inviteToken = crypto.randomBytes(32).toString('hex');
      inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const userData: any = {
      email,
      password: hashedPassword,
      role: roleNormalized,
      name,
    };

    if (roleNormalized === "CLIENT") {
      userData.company = company || null;
      userData.logo = logo || null;
      userData.colorHex = colorHex || "#5B4FFF";
      userData.postalAddress = postalAddress || null;
      userData.profileStatus = "INCOMPLETE";
      userData.inviteToken = inviteToken;
      userData.inviteExpires = inviteExpires;
      if (reqRole === "ERASPHERE") {
        userData.referredById = req.user.userId;
      }
    }

    if (roleNormalized === "ERASPHERE") {
      userData.company = company || null;
      userData.profileStatus = "INCOMPLETE";
      userData.inviteToken = inviteToken;
      userData.inviteExpires = inviteExpires;
    }

    const newUser = await prisma.user.create({
      data: userData,
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        postalAddress: true,
      },
    });

    if (reqRole === "ERASPHERE" && roleNormalized === "CLIENT") {
      const partner = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
      emit(EventType.ERASPHERE_NEW_CLIENT, {
        title: "EraSphere added a client",
        message: `${partner?.name ?? "EraSphere partner"} added client: ${newUser.name} (${newUser.email})`,
        link: "/admin/clients",
        clientId: newUser.id,
        actorId: req.user.userId,
      }).catch((err) => console.error("Failed to emit ERASPHERE_NEW_CLIENT:", err));
    }

    if (roleNormalized === "CLIENT" && domainName) {
      try {
        const expirationDate = domainExpiry ? new Date(domainExpiry + "T12:00:00") : null;
        const isValidExpiry = expirationDate && !isNaN(expirationDate.getTime());
        await prisma.domain.create({
          data: {
            clientId: newUser.id,
            domainName,
            isPrimary: true,
            expirationDate: isValidExpiry ? expirationDate : null,
          }
        });
        console.log(`✅ Domain ${domainName} created for client ${newUser.id}`);
      } catch (domainError) {
        console.error("❌ Error creating domain:", domainError);
      }
    }

    if ((roleNormalized === "CLIENT" || roleNormalized === "ERASPHERE") && inviteToken) {
      const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/complete-profile?token=${inviteToken}`;
      const isEraSphere = roleNormalized === "ERASPHERE";
      const emailSubject = isEraSphere ? 'Welcome to EraSphere – Complete Your Profile' : 'Complete Your Company Profile';
      const emailHeading = isEraSphere ? 'Welcome to EraSphere!' : `Welcome ${name}!`;
      const emailBody = isEraSphere
        ? 'You have been invited as an EraSphere Partner. Please complete your company profile by clicking the link below:'
        : 'Please complete your company profile by clicking the link below:';

      const hasDomainInfo = domainName || domainExpiry || hostingPlan || hostingExpiry;
      const formatDateForEmail = (d: string) => {
        const date = new Date(d);
        return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      };
      const domainSection = hasDomainInfo
        ? `
          <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">Domain & Hosting details (from your client page):</p>
            <ul style="margin: 0; padding-left: 20px;">
              ${domainName ? `<li><strong>Domain:</strong> ${domainName}</li>` : ""}
              ${domainExpiry ? `<li><strong>Domain expiry:</strong> ${formatDateForEmail(domainExpiry)}</li>` : ""}
              ${hostingPlan ? `<li><strong>Hosting plan:</strong> ${hostingPlan}</li>` : ""}
              ${hostingExpiry ? `<li><strong>Hosting expiry:</strong> ${formatDateForEmail(hostingExpiry)}</li>` : ""}
            </ul>
          </div>
        `
        : "";

      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: emailSubject,
          html: `
            <h2>${emailHeading}</h2>
            <p>${emailBody}</p>
            ${domainSection}
            <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
            <p>This link will expire in 7 days.</p>
          `,
        });
        console.log(`✅ Invite email sent to ${email}`);
      } catch (emailError) {
        console.error("❌ Error sending invite email:", emailError);
      }

      const responsePayload: Record<string, unknown> = { ...newUser };
      responsePayload.inviteLink = inviteLink;
      return res.status(201).json(responsePayload);
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// post complete profile
router.post("/complete-profile", uploadFile.array("files", 10), async (req, res) => {
  try {
    const {
      token,
      address,
      postalAddress,
      phoneNumber,
      extraEmails,
      brandPattern,
      shortInfo,
      logoIndex,
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return res.status(400).json({ error: "Invite token has expired" });
    }

    const updateData: any = {
      address,
      postalAddress,
      phoneNumber,
      extraEmails,
      brandPattern,
      shortInfo,
      profileStatus: "COMPLETE",
      inviteToken: null,
      inviteExpires: null,
    };

    const files = req.files as Express.Multer.File[];
    let logoPath = user.logo;

    // Profile files live on the persistent uploads volume (so they survive deploys)
    // and are served by the protected /uploads route.
    const profileFilesDir = path.join(uploadsDir, "profile-files", String(user.id));
    if (!fs.existsSync(profileFilesDir)) {
      fs.mkdirSync(profileFilesDir, { recursive: true });
    }

    if (files && files.length > 0) {
      // NEW: Copy all uploaded files to user's profile folder
      for (const file of files) {
        const sourcePath = path.join(filesDir, file.filename);
        const destPath = path.join(profileFilesDir, file.filename);
        
        try {
          fs.copyFileSync(sourcePath, destPath);
        } catch (copyError) {
          console.error("Error copying file:", copyError);
        }
      }

      // Select logo (existing logic - unchanged)
      if (logoIndex !== undefined) {
        const logoIdx = parseInt(logoIndex);
        if (logoIdx >= 0 && logoIdx < files.length) {
          logoPath = `/uploads/files/${files[logoIdx].filename}`;
        }
      } 
      else if (!user.logo) {
        const firstImage = files.find(f => f.mimetype.startsWith('image/'));
        if (firstImage) {
          logoPath = `/uploads/files/${firstImage.filename}`;
        } else {
          logoPath = `/uploads/files/${files[0].filename}`;
        }
      }
    }

    updateData.logo = logoPath;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        logo: true,
        profileStatus: true,
      },
    });

    await notifyProfileCompleted({
      name: updatedUser.name,
      email: updatedUser.email,
      company: updatedUser.company || undefined
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error completing profile:", error);
    res.status(500).json({ error: "Failed to complete profile" });
  }
});

// delete user (and all related data to avoid FK violations)
router.delete("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Comments and activity by this user (worker/any role)
      await tx.fileComment.deleteMany({ where: { userId: id } });
      await tx.taskComment.deleteMany({ where: { userId: id } });
      await tx.invite.deleteMany({ where: { invitedById: id } });

      if (user.role === "CLIENT") {
        // 2. Tasks for this client: files, comments, workers, then tasks
        const clientTaskIds = (await tx.task.findMany({ where: { clientId: id }, select: { id: true } })).map((t) => t.id);
        if (clientTaskIds.length > 0) {
          await tx.fileComment.deleteMany({ where: { file: { taskId: { in: clientTaskIds } } } });
          await tx.taskComment.deleteMany({ where: { taskId: { in: clientTaskIds } } });
          await tx.taskWorker.deleteMany({ where: { taskId: { in: clientTaskIds } } });
          await tx.taskFile.deleteMany({ where: { taskId: { in: clientTaskIds } } });
          await tx.task.deleteMany({ where: { id: { in: clientTaskIds } } });
        }
        // 3. Invoices (line items cascade in DB or delete explicitly)
        const invoiceIds = (await tx.invoice.findMany({ where: { clientId: id }, select: { id: true } })).map((i) => i.id);
        if (invoiceIds.length > 0) {
          await tx.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { clientId: id } });
        }
        // 4. Domains, unlink projects/timesheet projects
        await tx.domain.deleteMany({ where: { clientId: id } });
        await tx.project.updateMany({ where: { clientId: id }, data: { clientId: null } });
        await tx.timesheetProject.updateMany({ where: { clientId: id }, data: { clientId: null } });
      }

      // 5. If EraSphere: unlink referred clients so we can delete this user
      await tx.user.updateMany({ where: { referredById: id }, data: { referredById: null } });
      // Unlink any team members of this company so the FK doesn't block deletion.
      await tx.user.updateMany({ where: { companyOwnerId: id }, data: { companyOwnerId: null } });

      // 6. Notifications and preferences (may already cascade via schema; safe to delete explicitly)
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.notificationPreference.deleteMany({ where: { userId: id } });

      // 7. Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// get clients
router.get("/clients/list", verifyJWT, async (req: any, res) => {
  try {
    const { role, userId } = req.user;
    if (role !== "ADMIN" && role !== "WORKER" && role !== "ERASPHERE") {
      return res.status(403).json({ error: "Not authorized" });
    }

    let clientFilter: { role: "CLIENT"; id?: { in: number[] } } = { role: "CLIENT" };

    if (role === "WORKER") {
      // Workers may only see clients from tasks they are assigned to
      const assignedTasks = await prisma.taskWorker.findMany({
        where: { userId },
        select: { task: { select: { clientId: true } } },
      });
      const clientIds = [...new Set(
        assignedTasks.map((tw) => tw.task.clientId).filter((id): id is number => id !== null)
      )];
      clientFilter = { role: "CLIENT", id: { in: clientIds } };
    }

    const clients = await prisma.user.findMany({
      where: clientFilter,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        profileStatus: true,
      },
    });

    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// get all files for a specific client
router.get("/files/client/:clientId", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const tasks = await prisma.task.findMany({
      where: { clientId },
      include: {
        files: {
          include: {
            task: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    const allFiles = tasks.flatMap(task => 
      task.files.map(file => ({
        ...file,
        task: {
          id: task.id,
          title: task.title
        }
      }))
    );

    res.json(allFiles);
  } catch (error) {
    console.error("Error fetching client files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// get all profile files for the client
router.get("/profile-files/client/:clientId", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const profileFilesDir = path.join(uploadsDir, "profile-files", String(clientId));

    if (!fs.existsSync(profileFilesDir)) {
      return res.json([]);
    }

    const fileNames = fs.readdirSync(profileFilesDir);
    
    const files = fileNames.map(fileName => {
      const filePath = path.join(profileFilesDir, fileName);
      const stats = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      let fileType = 'application/octet-stream';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        fileType = `image/${ext.slice(1)}`;
      } else if (ext === '.pdf') {
        fileType = 'application/pdf';
      } else if (['.doc', '.docx'].includes(ext)) {
        fileType = 'application/msword';
      }
      
      return {
        id: `profile-${fileName}`,
        fileName: fileName,
        fileUrl: `/uploads/profile-files/${clientId}/${fileName}`,
        fileType: fileType,
        uploadedAt: stats.birthtime,
        caption: null,
        section: 'Profile',
        isCompleted: true,
        task: {
          id: 0,
          title: 'Profile Setup'
        }
      };
    });

    res.json(files);
  } catch (error) {
    console.error("Error fetching profile files:", error);
    res.status(500).json({ error: "Failed to fetch profile files" });
  }
});

// Admin/EraSphere upload brand files (and optionally a logo) for a client.
router.post("/:id/brand-files", verifyJWT, verifyAdminOrEraSphere, uploadFile.array("files", 10), async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const { role, userId } = req.user;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, referredById: true, logo: true } });
    if (!target || target.role !== "CLIENT") return res.status(404).json({ error: "Client not found" });
    if (role === "ERASPHERE" && target.referredById !== userId) return res.status(403).json({ error: "Not authorized to edit this client" });

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    const profileFilesDir = path.join(uploadsDir, "profile-files", String(id));
    fs.mkdirSync(profileFilesDir, { recursive: true });
    for (const file of files) {
      try {
        fs.copyFileSync(path.join(filesDir, file.filename), path.join(profileFilesDir, file.filename));
      } catch (copyErr) {
        console.error("Error copying brand file:", copyErr);
      }
    }

    // Set the logo: explicit logoIndex, else the first image when none exists yet.
    let logo = target.logo;
    const logoIndex = req.body.logoIndex;
    if (logoIndex !== undefined && logoIndex !== "") {
      const idx = parseInt(logoIndex, 10);
      if (idx >= 0 && idx < files.length) logo = `/uploads/files/${files[idx].filename}`;
    } else if (!target.logo) {
      const firstImage = files.find((f) => f.mimetype.startsWith("image/"));
      if (firstImage) logo = `/uploads/files/${firstImage.filename}`;
    }
    if (logo !== target.logo) {
      await prisma.user.update({ where: { id }, data: { logo } });
    }

    res.status(201).json({ message: "Files uploaded", count: files.length, logo });
  } catch (error) {
    console.error("Error uploading brand files:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// Admin/EraSphere edit a client's profile: brand colors + contact details.
router.patch("/:id", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const { role, userId } = req.user;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, referredById: true },
    });
    if (!target) return res.status(404).json({ error: "User not found" });

    // Workers: admin-only edit of display profile (name + nickname/emoji/skills).
    if (target.role === "WORKER") {
      if (role !== "ADMIN") return res.status(403).json({ error: "Only admins can edit workers" });
      const data: any = {};
      if (req.body.name !== undefined) data.name = String(req.body.name).trim();
      if ("nickname" in req.body) data.nickname = sanitizeNickname(req.body.nickname) ?? null;
      if ("avatarEmoji" in req.body) data.avatarEmoji = sanitizeEmoji(req.body.avatarEmoji) ?? null;
      if ("skills" in req.body) data.skills = sanitizeSkills(req.body.skills);
      const updatedWorker = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true, name: true, email: true, role: true,
          nickname: true, avatarEmoji: true, skills: true, profileStatus: true,
        },
      });
      return res.json(updatedWorker);
    }

    if (target.role !== "CLIENT") return res.status(404).json({ error: "Client not found" });
    if (role === "ERASPHERE" && target.referredById !== userId) {
      return res.status(403).json({ error: "Not authorized to edit this client" });
    }

    const { name, company, colorHex, brandPattern, shortInfo, postalAddress, address, phoneNumber } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (company !== undefined) data.company = company || null;
    if (colorHex !== undefined) data.colorHex = colorHex || null;
    if (brandPattern !== undefined) data.brandPattern = brandPattern || null;
    if (shortInfo !== undefined) data.shortInfo = shortInfo || null;
    if (postalAddress !== undefined) data.postalAddress = postalAddress || null;
    if (address !== undefined) data.address = address || null;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber || null;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, company: true, colorHex: true,
        brandPattern: true, shortInfo: true, postalAddress: true, address: true,
        phoneNumber: true, logo: true, role: true, profileStatus: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({ error: "Failed to update client" });
  }
});

export default router;