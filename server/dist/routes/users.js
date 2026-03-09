"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const notificationStore_1 = require("../services/notificationStore");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
const SALT_ROUNDS = 10;
const filesDir = "uploads/files";
if (!fs_1.default.existsSync(filesDir)) {
    fs_1.default.mkdirSync(filesDir, { recursive: true });
}
const fileStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, filesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, "file-" + uniqueSuffix + "-" + sanitizedName);
    },
});
const uploadFile = (0, multer_1.default)({
    storage: fileStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
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
// get all users (admin sees all; EraSphere sees only clients they referred)
router.get("/", auth_1.verifyJWT, auth_1.verifyAdminOrEraSphere, async (req, res) => {
    try {
        const { role, userId } = req.user;
        const whereClause = role === "ERASPHERE"
            ? { role: "CLIENT", referredById: userId }
            : {};
        const users = await prisma_1.default.user.findMany({
            where: whereClause,
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
                address: true,
                phoneNumber: true,
                referredById: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// get EraSphere partners (admin only) with stats: clientsCount, tasksCount
router.get("/erasphere", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const partners = await prisma_1.default.user.findMany({
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
        const partnersWithStats = await Promise.all(partners.map(async (p) => {
            const referredClients = await prisma_1.default.user.findMany({
                where: { role: "CLIENT", referredById: p.id },
                select: { id: true },
            });
            const clientIds = referredClients.map((c) => c.id);
            const tasksCount = clientIds.length === 0
                ? 0
                : await prisma_1.default.task.count({
                    where: { clientId: { in: clientIds } },
                });
            return {
                ...p,
                clientsCount: clientIds.length,
                tasksCount,
            };
        }));
        res.json(partnersWithStats);
    }
    catch (error) {
        console.error("Error fetching EraSphere partners:", error);
        res.status(500).json({ error: "Failed to fetch EraSphere partners" });
    }
});
// admin-only: aggregate EraSphere analytics (all partners, their clients, tasks, revenue)
router.get("/erasphere/admin-analytics", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const partners = await prisma_1.default.user.findMany({
            where: { role: "ERASPHERE" },
            select: { id: true },
        });
        const partnerIds = partners.map((p) => p.id);
        const erasphereClients = await prisma_1.default.user.findMany({
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
            prisma_1.default.task.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, title: true, status: true, clientId: true, createdAt: true },
            }),
            prisma_1.default.project.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, name: true, status: true, clientId: true, createdAt: true },
            }),
            prisma_1.default.invoice.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, amount: true, status: true, clientId: true, createdAt: true, invoiceNumber: true, paidAt: true },
            }),
        ]);
        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const paidRevenue = invoices.filter((inv) => inv.status === "PAID").reduce((sum, inv) => sum + inv.amount, 0);
        const pendingRevenue = invoices.filter((inv) => inv.status === "PENDING").reduce((sum, inv) => sum + inv.amount, 0);
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
    }
    catch (error) {
        console.error("Error fetching EraSphere admin analytics:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});
// get EraSphere member analytics (own clients, projects, tasks, invoice totals)
router.get("/erasphere/analytics", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role, userId } = req.user;
        if (role !== "ERASPHERE") {
            return res.status(403).json({ error: "Only EraSphere members can access this" });
        }
        const myClients = await prisma_1.default.user.findMany({
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
            prisma_1.default.task.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, title: true, status: true, clientId: true, createdAt: true },
            }),
            prisma_1.default.project.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, name: true, status: true, clientId: true, createdAt: true },
            }),
            prisma_1.default.invoice.findMany({
                where: { clientId: { in: clientIds } },
                select: { id: true, amount: true, status: true, clientId: true, createdAt: true, invoiceNumber: true, paidAt: true },
            }),
        ]);
        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const paidRevenue = invoices
            .filter((inv) => inv.status === "PAID")
            .reduce((sum, inv) => sum + inv.amount, 0);
        const pendingRevenue = invoices
            .filter((inv) => inv.status === "PENDING")
            .reduce((sum, inv) => sum + inv.amount, 0);
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
    }
    catch (error) {
        console.error("Error fetching EraSphere analytics:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});
// get user invite token
router.get("/by-token/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching user by token:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
// post resend invite email
router.post("/:id/resend-invite", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id: Number(id) },
        });
        if (!user || (user.role !== "CLIENT" && user.role !== "ERASPHERE")) {
            return res.status(404).json({ error: "User not found" });
        }
        const inviteToken = crypto_1.default.randomBytes(32).toString('hex');
        const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma_1.default.user.update({
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
        }
        catch (emailError) {
            console.error("❌ Error sending email:", emailError);
            res.status(500).json({ error: 'Failed to send invite email' });
        }
    }
    catch (error) {
        console.error("Error resending invite:", error);
        res.status(500).json({ error: "Failed to resend invite" });
    }
});
// get user by id (admin: any; EraSphere: only their referred clients)
router.get("/:id", auth_1.verifyJWT, auth_1.verifyAdminOrEraSphere, async (req, res) => {
    try {
        const requestedId = Number(req.params.id);
        const user = await prisma_1.default.user.findUnique({
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
        if (!user)
            return res.status(404).json({ error: "User not found" });
        if (req.user?.role === "ERASPHERE") {
            if (user.role !== "CLIENT" || user.referredById !== req.user.userId) {
                return res.status(403).json({ error: "You can only view clients you referred" });
            }
        }
        const { referredById, ...rest } = user;
        res.json(rest);
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
// create user (admin can create any role; EraSphere can create CLIENT only)
router.post("/", auth_1.verifyJWT, auth_1.verifyAdminOrEraSphere, async (req, res) => {
    try {
        const { email, password, role, name, company, logo, colorHex, postalAddress, domainName } = req.body;
        if (!email || !password || !role || !name) {
            return res.status(400).json({ error: "Email, password, role, and name are required" });
        }
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: "Email already in use" });
        const reqRole = req.user?.role;
        const bodyRole = (role || "").toUpperCase();
        if (reqRole !== "ADMIN" && bodyRole !== "CLIENT") {
            return res.status(403).json({ error: "Only admins can create workers or EraSphere partners" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const roleNormalized = bodyRole;
        if (!["ADMIN", "WORKER", "CLIENT", "ERASPHERE"].includes(roleNormalized)) {
            return res.status(400).json({ error: "Invalid role. Must be ADMIN, WORKER, CLIENT, or ERASPHERE" });
        }
        let inviteToken = null;
        let inviteExpires = null;
        if (roleNormalized === "CLIENT" || roleNormalized === "ERASPHERE") {
            inviteToken = crypto_1.default.randomBytes(32).toString('hex');
            inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        const userData = {
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
        const newUser = await prisma_1.default.user.create({
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
            try {
                const partner = await prisma_1.default.user.findUnique({
                    where: { id: req.user.userId },
                    select: { name: true },
                });
                await (0, notificationStore_1.notifyAdmins)("ERASPHERE_NEW_CLIENT", "EraSphere added a client", `${partner?.name ?? "EraSphere partner"} added client: ${newUser.name} (${newUser.email})`, "/admin/clients");
            }
            catch (err) {
                console.error("Failed to notify admins of new EraSphere client:", err);
            }
        }
        if (roleNormalized === "CLIENT" && domainName) {
            try {
                await prisma_1.default.domain.create({
                    data: {
                        clientId: newUser.id,
                        domainName,
                        isPrimary: true,
                    }
                });
                console.log(`✅ Domain ${domainName} created for client ${newUser.id}`);
            }
            catch (domainError) {
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
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: email,
                    subject: emailSubject,
                    html: `
            <h2>${emailHeading}</h2>
            <p>${emailBody}</p>
            <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
            <p>This link will expire in 7 days.</p>
          `,
                });
                console.log(`✅ Invite email sent to ${email}`);
            }
            catch (emailError) {
                console.error("❌ Error sending invite email:", emailError);
            }
            const responsePayload = { ...newUser };
            responsePayload.inviteLink = inviteLink;
            return res.status(201).json(responsePayload);
        }
        res.status(201).json(newUser);
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
// post complete profile
router.post("/complete-profile", uploadFile.array("files", 10), async (req, res) => {
    try {
        const { token, address, postalAddress, phoneNumber, extraEmails, brandPattern, shortInfo, logoIndex, } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Token is required" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { inviteToken: token },
        });
        if (!user) {
            return res.status(404).json({ error: "Invalid or expired token" });
        }
        if (user.inviteExpires && user.inviteExpires < new Date()) {
            return res.status(400).json({ error: "Invite token has expired" });
        }
        const updateData = {
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
        const files = req.files;
        let logoPath = user.logo;
        // NEW: Create profile files directory for this user
        const profileFilesDir = `uploads/profile-files/${user.id}`;
        if (!fs_1.default.existsSync(profileFilesDir)) {
            fs_1.default.mkdirSync(profileFilesDir, { recursive: true });
        }
        if (files && files.length > 0) {
            // NEW: Copy all uploaded files to user's profile folder
            for (const file of files) {
                const sourcePath = path_1.default.join(filesDir, file.filename);
                const destPath = path_1.default.join(profileFilesDir, file.filename);
                try {
                    fs_1.default.copyFileSync(sourcePath, destPath);
                }
                catch (copyError) {
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
                }
                else {
                    logoPath = `/uploads/files/${files[0].filename}`;
                }
            }
        }
        updateData.logo = logoPath;
        const updatedUser = await prisma_1.default.user.update({
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
        await (0, notifications_1.notifyProfileCompleted)({
            name: updatedUser.name,
            email: updatedUser.email,
            company: updatedUser.company || undefined
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error("Error completing profile:", error);
        res.status(500).json({ error: "Failed to complete profile" });
    }
});
// delete user
router.delete("/:id", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        await prisma_1.default.user.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});
// get clients
router.get("/clients/list", auth_1.verifyJWT, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== "ADMIN" && role !== "WORKER" && role !== "ERASPHERE") {
            return res.status(403).json({ error: "Not authorized" });
        }
        const clients = await prisma_1.default.user.findMany({
            where: { role: "CLIENT" },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                profileStatus: true,
            },
        });
        res.json(clients);
    }
    catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});
// get all files for a specific client
router.get("/files/client/:clientId", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);
        const tasks = await prisma_1.default.task.findMany({
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
        const allFiles = tasks.flatMap(task => task.files.map(file => ({
            ...file,
            task: {
                id: task.id,
                title: task.title
            }
        })));
        res.json(allFiles);
    }
    catch (error) {
        console.error("Error fetching client files:", error);
        res.status(500).json({ error: "Failed to fetch files" });
    }
});
// get all profile files for the client
router.get("/profile-files/client/:clientId", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);
        const profileFilesDir = path_1.default.join(__dirname, `../../uploads/profile-files/${clientId}`);
        if (!fs_1.default.existsSync(profileFilesDir)) {
            return res.json([]);
        }
        const fileNames = fs_1.default.readdirSync(profileFilesDir);
        const files = fileNames.map(fileName => {
            const filePath = path_1.default.join(profileFilesDir, fileName);
            const stats = fs_1.default.statSync(filePath);
            const ext = path_1.default.extname(fileName).toLowerCase();
            let fileType = 'application/octet-stream';
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                fileType = `image/${ext.slice(1)}`;
            }
            else if (ext === '.pdf') {
                fileType = 'application/pdf';
            }
            else if (['.doc', '.docx'].includes(ext)) {
                fileType = 'application/msword';
            }
            return {
                id: `profile-${fileName}`,
                fileName: fileName,
                fileUrl: `uploads/profile-files/${clientId}/${fileName}`,
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
    }
    catch (error) {
        console.error("Error fetching profile files:", error);
        res.status(500).json({ error: "Failed to fetch profile files" });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map