import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

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

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name,
        company: user.company,
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
        company: true,
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

export default router;