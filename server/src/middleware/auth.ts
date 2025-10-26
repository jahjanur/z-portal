import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: { userId: number; role: string};
}

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  });
}

export function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  next();
}