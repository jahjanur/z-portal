import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: { userId: number; role: string; companyOwnerId?: number | null };
}

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
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

export function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  next();
}

export function verifyAdminOrEraSphere(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "ERASPHERE") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}