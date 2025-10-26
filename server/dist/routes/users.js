"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const SALT_ROUNDS = 10;
// ----------------------
// GET all users (Admin only)
// ----------------------
router.get("/", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                company: true,
                logo: true,
                colorHex: true,
                address: true,
                postalAddress: true,
                phoneNumber: true,
                extraEmails: true,
                brandPattern: true,
                shortInfo: true,
                profileStatus: true,
                createdAt: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// ----------------------
// GET user by ID
// ----------------------
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;
        const targetUserId = Number(req.params.id);
        // Allow users to view their own profile, or admins to view any profile
        if (requestingUserRole !== "ADMIN" && requestingUserId !== targetUserId) {
            return res.status(403).json({ error: "Not authorized" });
        }
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                company: true,
                logo: true,
                colorHex: true,
                address: true,
                postalAddress: true,
                phoneNumber: true,
                extraEmails: true,
                brandPattern: true,
                shortInfo: true,
                profileStatus: true,
                createdAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
// ----------------------
// CREATE new user (Admin only)
// ----------------------
router.post("/", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { email, password, role, name, company, postalAddress, contactPersonName } = req.body;
        if (!email || !role || !name) {
            return res.status(400).json({ error: "Email, role, and name are required" });
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: "Email already in use" });
        const roleNormalized = role.toUpperCase();
        if (!["ADMIN", "WORKER", "CLIENT"].includes(roleNormalized)) {
            return res.status(400).json({ error: "Invalid role. Must be ADMIN, WORKER, or CLIENT" });
        }
        const userData = {
            email,
            role: roleNormalized,
            name: contactPersonName || name,
        };
        // For CLIENT role
        if (roleNormalized === "CLIENT") {
            // Generate temporary password if not provided
            const tempPassword = password || crypto_1.default.randomBytes(8).toString("hex");
            userData.password = await bcrypt_1.default.hash(tempPassword, SALT_ROUNDS);
            // Set company info
            userData.company = company || null;
            userData.postalAddress = postalAddress || null;
            // Generate invite token
            const inviteToken = crypto_1.default.randomBytes(32).toString("hex");
            userData.inviteToken = inviteToken;
            userData.inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            userData.profileStatus = "INCOMPLETE";
            const newUser = await prisma.user.create({
                data: userData,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    name: true,
                    company: true,
                    postalAddress: true,
                    profileStatus: true,
                    inviteToken: true,
                    createdAt: true,
                },
            });
            // Send invitation email
            try {
                await (0, emailService_1.sendClientInviteEmail)(newUser.email, newUser.name, inviteToken);
            }
            catch (emailError) {
                console.error("Failed to send invite email:", emailError);
                // Don't fail the request if email fails
            }
            // Don't send back the token in response
            const { inviteToken: _, ...userResponse } = newUser;
            return res.status(201).json(userResponse);
        }
        // For ADMIN and WORKER roles
        if (!password) {
            return res.status(400).json({ error: "Password is required for this role" });
        }
        userData.password = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const newUser = await prisma.user.create({
            data: userData,
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                createdAt: true,
            },
        });
        res.status(201).json(newUser);
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
// ----------------------
// UPDATE user profile (Self or Admin)
// ----------------------
router.put("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;
        const targetUserId = Number(req.params.id);
        // Check authorization
        if (requestingUserRole !== "ADMIN" && requestingUserId !== targetUserId) {
            return res.status(403).json({ error: "Not authorized" });
        }
        const { email, password, role, name, company, logo, colorHex, address, postalAddress, phoneNumber, extraEmails, brandPattern, shortInfo } = req.body;
        const data = {};
        // Only admins can change email, role, or other users' passwords
        if (requestingUserRole === "ADMIN") {
            if (email)
                data.email = email;
            if (role)
                data.role = role.toUpperCase();
            if (password)
                data.password = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        }
        else {
            // Non-admins can only change their own password
            if (password)
                data.password = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        }
        // Profile fields anyone can update (for themselves)
        if (name !== undefined)
            data.name = name;
        if (company !== undefined)
            data.company = company;
        if (logo !== undefined)
            data.logo = logo;
        if (colorHex !== undefined)
            data.colorHex = colorHex;
        if (address !== undefined)
            data.address = address;
        if (postalAddress !== undefined)
            data.postalAddress = postalAddress;
        if (phoneNumber !== undefined)
            data.phoneNumber = phoneNumber;
        if (extraEmails !== undefined)
            data.extraEmails = extraEmails;
        if (brandPattern !== undefined)
            data.brandPattern = brandPattern;
        if (shortInfo !== undefined)
            data.shortInfo = shortInfo;
        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data,
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                company: true,
                logo: true,
                colorHex: true,
                address: true,
                postalAddress: true,
                phoneNumber: true,
                extraEmails: true,
                brandPattern: true,
                shortInfo: true,
                profileStatus: true,
                createdAt: true,
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});
// ----------------------
// COMPLETE CLIENT PROFILE (via invite token)
// ----------------------
router.post("/complete-profile", async (req, res) => {
    try {
        const { token, password, address, phoneNumber, extraEmails, brandPattern, shortInfo, colorHex, logo } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Invite token is required" });
        }
        // Find user by token
        const user = await prisma.user.findUnique({
            where: { inviteToken: token }
        });
        if (!user) {
            return res.status(404).json({ error: "Invalid or expired invite token" });
        }
        // Check if token is expired
        if (user.inviteExpires && user.inviteExpires < new Date()) {
            return res.status(400).json({ error: "Invite token has expired" });
        }
        // Check if profile is already complete
        if (user.profileStatus === "COMPLETE") {
            return res.status(400).json({ error: "Profile already completed" });
        }
        // Validate required fields
        if (!password || !address || !phoneNumber) {
            return res.status(400).json({
                error: "Password, address, and phone number are required"
            });
        }
        // Update user profile
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                address,
                phoneNumber,
                extraEmails: extraEmails || null,
                brandPattern: brandPattern || null,
                shortInfo: shortInfo || null,
                colorHex: colorHex || null,
                logo: logo || null,
                profileStatus: "COMPLETE",
                inviteToken: null, // Clear the token
                inviteExpires: null
            },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                company: true,
                profileStatus: true,
            }
        });
        res.json({
            message: "Profile completed successfully",
            user: updatedUser
        });
    }
    catch (error) {
        console.error("Error completing profile:", error);
        res.status(500).json({ error: "Failed to complete profile" });
    }
});
// ----------------------
// VERIFY INVITE TOKEN (check if valid before showing form)
// ----------------------
router.get("/verify-invite/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const user = await prisma.user.findUnique({
            where: { inviteToken: token },
            select: {
                id: true,
                email: true,
                name: true,
                company: true,
                profileStatus: true,
                inviteExpires: true,
            }
        });
        if (!user) {
            return res.status(404).json({ error: "Invalid invite token" });
        }
        if (user.inviteExpires && user.inviteExpires < new Date()) {
            return res.status(400).json({ error: "Invite token has expired" });
        }
        if (user.profileStatus === "COMPLETE") {
            return res.status(400).json({ error: "Profile already completed" });
        }
        res.json({
            valid: true,
            user: {
                email: user.email,
                name: user.name,
                company: user.company
            }
        });
    }
    catch (error) {
        console.error("Error verifying invite:", error);
        res.status(500).json({ error: "Failed to verify invite" });
    }
});
// ----------------------
// DELETE user
// ----------------------
router.delete("/:id", auth_1.verifyJWT, auth_1.verifyAdmin, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});
// ----------------------
// GET clients (Admin → all clients, Worker → only assigned ones)
// ----------------------
router.get("/clients", auth_1.verifyJWT, async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        if (role === "ADMIN") {
            const clients = await prisma.user.findMany({
                where: { role: "CLIENT" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    company: true,
                    logo: true,
                    colorHex: true,
                    profileStatus: true,
                    address: true,
                    phoneNumber: true,
                },
            });
            return res.json(clients);
        }
        if (role === "WORKER") {
            const tasks = await prisma.task.findMany({
                where: { workerId: userId },
                select: { clientId: true },
            });
            const clientIds = [...new Set(tasks.map((t) => t.clientId))];
            if (clientIds.length === 0)
                return res.json([]);
            const clients = await prisma.user.findMany({
                where: { id: { in: clientIds } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    company: true,
                    logo: true,
                    colorHex: true,
                    profileStatus: true,
                },
            });
            return res.json(clients);
        }
        return res.status(403).json({ error: "Not authorized" });
    }
    catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map