"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
exports.verifyAdmin = verifyAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "secret";
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "Unauthorized" });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({ message: "Forbidden" });
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    });
}
function verifyAdmin(req, res, next) {
    if (req.user?.role !== "ADMIN")
        return res.status(403).json({ message: "Forbidden" });
    next();
}
//# sourceMappingURL=auth.js.map