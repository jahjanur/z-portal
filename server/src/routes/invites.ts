import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { verifyJWT, verifyAdmin, verifyAdminOrEraSphere } from "../middleware/auth";
import prisma from "../lib/prisma";
import { sendInviteEmail, sendWelcomeEmailForRole } from "../services/inviteEmails";
import { emit, EventType } from "../services/notificationEngine";
import { sanitizeNickname, sanitizeEmoji, sanitizeSkills } from "../constants/workerProfile";
import { clientScopeId } from "../lib/clientScope";

const router = Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const INVITE_EXPIRY_HOURS = 72;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const acceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /invites — create a new invite (admin or erasphere for CLIENT)
router.post("/", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const { email, name, role, company, domainName, domainExpiry, hostingPlan, hostingExpiry } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ error: "Email, name, and role are required" });
    }

    const normalizedRole = (String(role)).toUpperCase();
    if (!["WORKER", "CLIENT", "ERASPHERE"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Role must be WORKER, CLIENT, or ERASPHERE" });
    }

    const reqRole = req.user?.role;
    if (reqRole !== "ADMIN" && normalizedRole !== "CLIENT") {
      return res.status(403).json({ error: "Only admins can invite workers or EraSphere partners" });
    }

    const userId = req.user?.userId;
    if (userId == null || typeof userId !== "number") {
      console.error("Invite create: missing or invalid userId", req.user);
      return res.status(401).json({ error: "Invalid session. Please log in again." });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true, role: true, name: true },
    });
    if (existingUser) {
      const roleHint =
        existingUser.role === "CLIENT"
          ? "Check the Clients list and remove them there first."
          : existingUser.role === "ERASPHERE"
            ? "Check the EraSphere Partners list and remove them there first."
            : "Check the Workers list and remove them there first.";
      return res.status(400).json({
        error: "A user with this email already exists",
        existingRole: existingUser.role,
        hint: roleHint,
      });
    }

    // Invalidate any pending invites for this email+role
    await prisma.invite.updateMany({
      where: { email: emailNorm, role: normalizedRole, used: false, cancelled: false },
      data: { cancelled: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        email: emailNorm,
        name: String(name).trim(),
        role: normalizedRole,
        tokenHash,
        invitedById: userId,
        company: company != null ? String(company).trim() || null : null,
        domainName: domainName != null ? String(domainName) || null : null,
        domainExpiry: domainExpiry != null ? String(domainExpiry) || null : null,
        hostingPlan: hostingPlan != null ? String(hostingPlan) || null : null,
        hostingExpiry: hostingExpiry != null ? String(hostingExpiry) || null : null,
        expiresAt,
      },
    });

    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${clientUrl}/invite/accept?token=${rawToken}`;

    try {
      await sendInviteEmail({
        to: invite.email,
        name: invite.name,
        role: normalizedRole,
        company: invite.company,
        inviteLink,
        expiresInHours: INVITE_EXPIRY_HOURS,
      });
    } catch (emailErr) {
      console.error("Failed to send invite email:", emailErr);
      console.log(`[INVITE LINK - EMAIL FAILED]: ${inviteLink}`);
    }

    return res.status(201).json({
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      company: invite.company,
      expiresAt: invite.expiresAt.toISOString(),
      inviteLink,
    });
  } catch (error: any) {
    console.error("Error creating invite:", error);
    const code = error?.code;
    if (code === "P2002") {
      return res.status(400).json({ error: "An invite for this email and role already exists. Cancel it first or use a different email." });
    }
    if (code === "P2003") {
      return res.status(400).json({ error: "Invalid session. Please log in again." });
    }
    return res.status(500).json({ error: "Failed to create invite" });
  }
});

// POST /invites/team-member — admin invites an extra founder/member to a company.
// The new user is a CLIENT linked to the company via companyOwnerId, so they
// share all of that company's tasks, invoices, domains and feedback.
router.post("/team-member", verifyJWT, verifyAdmin, async (req: any, res) => {
  try {
    const { companyOwnerId, email, name } = req.body;
    const ownerId = Number(companyOwnerId);
    if (!Number.isInteger(ownerId)) return res.status(400).json({ error: "companyOwnerId is required" });
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

    const company = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true, company: true, companyOwnerId: true, name: true },
    });
    if (!company || company.role !== "CLIENT") return res.status(404).json({ error: "Company not found" });
    // Always anchor to the primary account (in case an admin passed a member's id).
    const primaryId = company.companyOwnerId ?? company.id;

    const emailNorm = String(email).toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: emailNorm }, select: { id: true, role: true } });
    if (existingUser) return res.status(400).json({ error: "A user with this email already exists" });

    await prisma.invite.updateMany({
      where: { email: emailNorm, role: "CLIENT", used: false, cancelled: false },
      data: { cancelled: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invite = await prisma.invite.create({
      data: {
        email: emailNorm,
        name: String(name).trim(),
        role: "CLIENT",
        tokenHash: hashToken(rawToken),
        invitedById: req.user.userId,
        company: company.company || null,
        companyOwnerId: primaryId,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${clientUrl}/invite/accept?token=${rawToken}`;
    try {
      await sendInviteEmail({ to: invite.email, name: invite.name, role: "CLIENT", company: invite.company, inviteLink, expiresInHours: INVITE_EXPIRY_HOURS });
    } catch (emailErr) {
      console.error("Failed to send team-member invite email:", emailErr);
      console.log(`[TEAM INVITE LINK - EMAIL FAILED]: ${inviteLink}`);
    }

    return res.status(201).json({ id: invite.id, email: invite.email, name: invite.name, inviteLink });
  } catch (error: any) {
    console.error("Error inviting team member:", error);
    return res.status(500).json({ error: "Failed to invite team member" });
  }
});

// POST /invites/my-team-member — a CLIENT invites a collaborator to their OWN
// company. The company is taken from the caller's scope (never a param), so a
// client can only add people to their own company.
router.post("/my-team-member", verifyJWT, async (req: any, res) => {
  try {
    if (req.user.role !== "CLIENT") return res.status(403).json({ error: "Only clients can add collaborators" });
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

    const companyId = clientScopeId(req.user);
    const company = await prisma.user.findUnique({ where: { id: companyId }, select: { id: true, company: true } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const emailNorm = String(email).toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: emailNorm }, select: { id: true } });
    if (existingUser) return res.status(400).json({ error: "A user with this email already exists" });

    await prisma.invite.updateMany({
      where: { email: emailNorm, role: "CLIENT", used: false, cancelled: false },
      data: { cancelled: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invite = await prisma.invite.create({
      data: {
        email: emailNorm,
        name: String(name).trim(),
        role: "CLIENT",
        tokenHash: hashToken(rawToken),
        invitedById: req.user.userId,
        company: company.company || null,
        companyOwnerId: companyId,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${clientUrl}/invite/accept?token=${rawToken}`;
    try {
      await sendInviteEmail({ to: invite.email, name: invite.name, role: "CLIENT", company: invite.company, inviteLink, expiresInHours: INVITE_EXPIRY_HOURS });
    } catch (emailErr) {
      console.error("Failed to send collaborator invite email:", emailErr);
      console.log(`[COLLABORATOR INVITE LINK - EMAIL FAILED]: ${inviteLink}`);
    }
    return res.status(201).json({ id: invite.id, email: invite.email, name: invite.name, inviteLink });
  } catch (error: any) {
    console.error("Error inviting collaborator:", error);
    return res.status(500).json({ error: "Failed to invite collaborator" });
  }
});

// GET /invites — list invites (admin only)
router.get("/", verifyJWT, verifyAdmin, async (_req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        used: true,
        cancelled: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });
    const now = new Date();
    const mapped = invites.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      status: inv.used ? "ACCEPTED" : inv.cancelled ? "CANCELLED" : inv.expiresAt < now ? "EXPIRED" : "PENDING",
    }));
    return res.json(mapped);
  } catch (error: any) {
    console.error("Error listing invites:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to list invites" });
  }
});

// GET /invites/validate?token=... (public)
router.get("/validate", async (req, res) => {
  try {
    const rawToken = req.query.token as string;
    if (!rawToken) return res.status(400).json({ error: "Token is required" });

    const tokenHash = hashToken(rawToken);
    const invite = await prisma.invite.findUnique({ where: { tokenHash } });

    if (!invite) return res.status(404).json({ error: "Invalid invite link" });
    if (invite.cancelled) return res.status(400).json({ error: "This invitation has been cancelled" });
    if (invite.used) return res.status(410).json({ error: "This invite has already been used." });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: "This invite has expired." });

    return res.json({
      role: invite.role,
      email: invite.email,
      name: invite.name,
      company: invite.company,
    });
  } catch (error: any) {
    console.error("Error validating invite:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to validate invite" });
  }
});

// POST /invites/accept (public, rate-limited)
router.post("/accept", acceptLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const tokenHash = hashToken(token);
    const invite = await prisma.invite.findUnique({ where: { tokenHash } });

    if (!invite) return res.status(404).json({ error: "Invalid invite link" });
    if (invite.cancelled) return res.status(400).json({ error: "This invitation has been cancelled" });
    if (invite.used) return res.status(410).json({ error: "This invite has already been used." });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: "This invite has expired." });

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      await prisma.invite.update({ where: { id: invite.id }, data: { used: true, usedAt: new Date() } });
      return res.status(400).json({ error: "An account with this email already exists. Please log in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const userData: any = {
      email: invite.email,
      password: hashedPassword,
      role: invite.role,
      name: invite.name,
      profileStatus: invite.role === "WORKER" ? "COMPLETE" : "COMPLETE",
    };

    // Workers pick a personal nickname + emoji + skills during onboarding.
    if (invite.role === "WORKER") {
      userData.nickname = sanitizeNickname(req.body.nickname) ?? null;
      userData.avatarEmoji = sanitizeEmoji(req.body.avatarEmoji) ?? null;
      userData.skills = sanitizeSkills(req.body.skills);
    }

    if (invite.role === "CLIENT") {
      userData.company = invite.company || null;
      userData.colorHex = "#5B4FFF";
      userData.profileStatus = "COMPLETE";
      // Team member of an existing company → shares that company's data.
      if (invite.companyOwnerId) userData.companyOwnerId = invite.companyOwnerId;
    }

    if (invite.role === "ERASPHERE") {
      userData.company = invite.company || null;
      userData.profileStatus = "COMPLETE";
    }

    // If invited by an EraSphere partner for a CLIENT role, set referredById
    if (invite.role === "CLIENT") {
      const inviter = await prisma.user.findUnique({
        where: { id: invite.invitedById },
        select: { role: true },
      });
      if (inviter?.role === "ERASPHERE") {
        userData.referredById = invite.invitedById;
      }
    }

    const newUser = await prisma.user.create({ data: userData });

    // Mark invite as used
    await prisma.invite.update({
      where: { id: invite.id },
      data: { used: true, usedAt: new Date() },
    });

    // Create domain if invite had domain info (CLIENT)
    if (invite.role === "CLIENT" && invite.domainName) {
      try {
        const expirationDate = invite.domainExpiry ? new Date(invite.domainExpiry + "T12:00:00") : null;
        const isValidExpiry = expirationDate && !isNaN(expirationDate.getTime());
        await prisma.domain.create({
          data: {
            clientId: newUser.id,
            domainName: invite.domainName,
            isPrimary: true,
            expirationDate: isValidExpiry ? expirationDate : null,
          },
        });
      } catch (domainErr) {
        console.error("Error creating domain from invite:", domainErr);
      }
    }

    const jwtToken = jwt.sign({ userId: newUser.id, role: newUser.role, companyOwnerId: newUser.companyOwnerId ?? null }, JWT_SECRET, { expiresIn: "7d" });

    // Emit account-created notification
    const eventTypeMap: Record<string, string> = {
      WORKER: EventType.WORKER_CREATED,
      CLIENT: EventType.CLIENT_CREATED,
      ERASPHERE: EventType.ERASPHERE_CREATED,
    };
    const evtType = eventTypeMap[invite.role];
    if (evtType) {
      emit(evtType as any, {
        title: `New ${invite.role.charAt(0) + invite.role.slice(1).toLowerCase()} joined`,
        message: `${newUser.name} (${newUser.email}) accepted their invite and joined as ${invite.role}`,
        link: invite.role === "WORKER" ? "/admin/zulbera/workers" : invite.role === "CLIENT" ? "/admin/zulbera/clients" : "/admin/erasphere/partners",
        userId: newUser.id,
        clientId: invite.role === "CLIENT" ? newUser.id : undefined,
      }).catch((err) => console.error("Failed to emit account-created notification:", err));
    }

    // If referred by EraSphere, notify the partner
    if (invite.role === "CLIENT" && newUser.referredById) {
      emit(EventType.ERASPHERE_REFERRED_ACCEPTED, {
        title: "Referred client accepted",
        message: `${newUser.name} (${newUser.email}) has accepted the invitation and joined Z-Portal`,
        link: `/clients/${newUser.id}`,
        clientId: newUser.id,
      }).catch((err) => console.error("Failed to emit ERASPHERE_REFERRED_ACCEPTED:", err));
    }

    sendWelcomeEmailForRole(invite.role, { email: newUser.email, name: newUser.name, company: newUser.company }).catch(
      (err) => console.error("Failed to send welcome email:", err)
    );

    return res.json({
      token: jwtToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        nickname: newUser.nickname,
        avatarEmoji: newUser.avatarEmoji,
        skills: newUser.skills,
        company: newUser.company,
      },
    });
  } catch (error: any) {
    console.error("Error accepting invite:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to accept invite" });
  }
});

// POST /invites/:id/resend — admin: any; EraSphere: own invites only
router.post("/:id/resend", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const inviteId = Number(req.params.id);
    const oldInvite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!oldInvite) return res.status(404).json({ error: "Invite not found" });
    if (oldInvite.used) return res.status(400).json({ error: "Invite has already been accepted" });
    if (req.user?.role === "ERASPHERE" && oldInvite.invitedById !== req.user.userId) {
      return res.status(403).json({ error: "You can only resend invites you created" });
    }

    // Cancel the old invite
    await prisma.invite.update({ where: { id: inviteId }, data: { cancelled: true } });

    // Create a new invite
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const newInvite = await prisma.invite.create({
      data: {
        email: oldInvite.email,
        name: oldInvite.name,
        role: oldInvite.role,
        tokenHash,
        invitedById: (req as any).user.userId,
        company: oldInvite.company,
        domainName: oldInvite.domainName,
        domainExpiry: oldInvite.domainExpiry,
        hostingPlan: oldInvite.hostingPlan,
        hostingExpiry: oldInvite.hostingExpiry,
        expiresAt,
      },
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const inviteLink = `${clientUrl}/invite/accept?token=${rawToken}`;

    try {
      await sendInviteEmail({
        to: newInvite.email,
        name: newInvite.name,
        role: newInvite.role,
        company: newInvite.company,
        inviteLink,
        expiresInHours: INVITE_EXPIRY_HOURS,
      });
    } catch (emailErr) {
      console.error("Failed to send resend invite email:", emailErr);
      console.log(`[INVITE LINK - EMAIL FAILED]: ${inviteLink}`);
    }

    return res.json({
      id: newInvite.id,
      email: newInvite.email,
      name: newInvite.name,
      role: newInvite.role,
      expiresAt: newInvite.expiresAt.toISOString(),
      inviteLink,
    });
  } catch (error: any) {
    console.error("Error resending invite:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to resend invite" });
  }
});

// POST /invites/:id/cancel — admin: any; EraSphere: own invites only
router.post("/:id/cancel", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const inviteId = Number(req.params.id);
    const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.used) return res.status(400).json({ error: "Invite has already been accepted" });
    if (req.user?.role === "ERASPHERE" && invite.invitedById !== req.user.userId) {
      return res.status(403).json({ error: "You can only cancel invites you created" });
    }

    await prisma.invite.update({ where: { id: inviteId }, data: { cancelled: true } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling invite:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to cancel invite" });
  }
});

// GET /invites/for-role/:role — admin: all invites for role; EraSphere: only their own CLIENT invites
router.get("/for-role/:role", verifyJWT, verifyAdminOrEraSphere, async (req: any, res) => {
  try {
    const role = String(req.params.role || "").toUpperCase();
    if (!["WORKER", "CLIENT", "ERASPHERE"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const isEraSphere = req.user?.role === "ERASPHERE";
    if (isEraSphere && role !== "CLIENT") {
      return res.status(403).json({ error: "EraSphere can only list invites for CLIENT role" });
    }

    const where: { role: string; invitedById?: number } = { role };
    if (isEraSphere && req.user?.userId != null) {
      where.invitedById = Number(req.user.userId);
    }

    const invites = await prisma.invite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        used: true,
        cancelled: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const mapped = invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      name: inv.name,
      company: inv.company,
      role: inv.role,
      used: inv.used,
      cancelled: inv.cancelled,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      invitedBy: inv.invitedBy,
      status: inv.used ? "ACCEPTED" : inv.cancelled ? "CANCELLED" : inv.expiresAt < now ? "EXPIRED" : "PENDING",
    }));

    return res.json(mapped);
  } catch (error: any) {
    console.error("Error fetching invites by role:", error?.message, "code:", error?.code, "meta:", error?.meta);
    return res.status(500).json({ error: "Failed to fetch invites" });
  }
});

export default router;
