import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

/** Forge a valid JWT for a given user/role (mirrors the app's auth payload). */
export function makeToken(payload: { userId: number; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

/** A non-existent but valid 32-bit integer id, for 404 tests. */
export const MISSING_ID = 999999999;
