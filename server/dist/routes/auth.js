"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";
// =================== LOGIN ===================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
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
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
    }
});
// =================== VERIFY TOKEN ===================
router.get("/verify", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
    }
    catch (err) {
        console.error("Token verification error:", err);
        return res.status(401).json({ message: "Invalid token" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map