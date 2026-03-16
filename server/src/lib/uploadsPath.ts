import path from "path";
import fs from "fs";

/** Absolute path to the uploads directory (same for multer and express.static). */
export const uploadsDir = path.join(__dirname, "..", "uploads");

/** Ensure uploads directory exists (call at startup). */
export function ensureUploadsDir(): void {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
