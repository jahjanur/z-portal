"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
exports.verifyAdmin = verifyAdmin;
exports.verifyAdminOrEraSphere = verifyAdminOrEraSphere;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "secret";
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "Unauthorized" });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        // Expired or otherwise invalid token → 401 (unauthenticated), so the
        // client knows to clear the session and send the user back to login.
        // (Role/permission failures stay 403 below — those are *authenticated*.)
        if (err) {
            const expired = err.name === "TokenExpiredError";
            return res
                .status(401)
                .json({ message: expired ? "Session expired" : "Invalid token", code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID" });
        }
        const role = typeof decoded?.role === "string" ? decoded.role.toUpperCase() : decoded?.role;
        req.user = { userId: decoded.userId, role, companyOwnerId: decoded.companyOwnerId ?? null };
        next();
    });
}
function verifyAdmin(req, res, next) {
    if (req.user?.role !== "ADMIN")
        return res.status(403).json({ message: "Forbidden" });
    next();
}
function verifyAdminOrEraSphere(req, res, next) {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "ERASPHERE") {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
}
//# sourceMappingURL=auth.js.map