import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { sendPasswordResetEmail } from "../services/passwordResetEmail";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const SALT_ROUNDS = 10;

// login
router.post("/login", async (req, res) => {
  try {
    const rawEmail = req.body.email;
    const rawPassword = req.body.password;
    if (!rawEmail || !rawPassword) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPassword).trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = String(user.role || "").toUpperCase();
    const token = jwt.sign(
      { userId: user.id, role, companyOwnerId: user.companyOwnerId ?? null },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role,
        name: user.name,
        nickname: user.nickname,
        avatarEmoji: user.avatarEmoji,
        skills: user.skills,
        company: user.company,
        companyOwnerId: user.companyOwnerId,
        logo: user.logo,
        colorHex: user.colorHex
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? `Login failed: ${err.message}`
        : "Login failed";
    return res.status(500).json({ message });
  }
});

// verification
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        nickname: true,
        avatarEmoji: true,
        skills: true,
        company: true,
        companyOwnerId: true,
        logo: true,
        colorHex: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
});

// ---- Password reset (self-service "forgot password" + admin-triggered) ----

/** Generate a reset token for a user and email them the link. Shared by the
 *  self-service flow here and the admin-triggered endpoint in users.ts. */
export async function issuePasswordReset(
  user: { id: number; email: string; name: string | null },
  opts: { byAdmin?: boolean; ttlHours?: number } = {}
): Promise<boolean> {
  const ttlHours = opts.ttlHours ?? 1;
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetExpires: expires },
  });
  return sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    token,
    byAdmin: opts.byAdmin,
    expiresLabel: ttlHours === 1 ? "1 hour" : `${ttlHours} hours`,
  });
}

// POST /auth/forgot-password — user requests a reset link by email.
// Always responds 200 (never reveals whether an account exists).
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
    if (user) {
      await issuePasswordReset(user, { ttlHours: 1 }).catch((e) =>
        console.error("forgot-password email failed:", e)
      );
    }
    return res.json({ message: "If that email is registered, a reset link is on its way." });
  } catch (err) {
    console.error("forgot-password error:", err);
    return res.status(500).json({ message: "Could not process the request" });
  }
});

// GET /auth/reset/:token — validate a reset token (for the reset page).
router.get("/reset/:token", async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { resetToken: req.params.token },
      select: { email: true, name: true, resetExpires: true },
    });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }
    return res.json({ email: user.email, name: user.name });
  } catch (err) {
    console.error("reset validate error:", err);
    return res.status(500).json({ message: "Could not validate the link" });
  }
});

// POST /auth/reset — set a new password using a valid token.
router.post("/reset", async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
      select: { id: true, resetExpires: true },
    });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetExpires: null },
    });
    return res.json({ message: "Your password has been updated. You can sign in now." });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ message: "Could not reset the password" });
  }
});

export default router;