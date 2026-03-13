import dotenv from "dotenv";
import path from "path";

// .env is also preloaded by "npm run dev" via node -r dotenv/config so it's set before Prisma is used
dotenv.config();
if (process.env.NODE_ENV === "production") {
  // Load from server/.env.production so it works regardless of cwd (e.g. in Docker)
  const productionEnv = path.join(__dirname, "..", ".env.production");
  dotenv.config({ path: productionEnv, override: true });
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Create server/.env from server/.env.example and set DATABASE_URL.");
  process.exit(1);
}

import app from "./app";
import { scheduleDomainRenewalReminders } from "./jobs/domainRenewalReminder";

scheduleDomainRenewalReminders();

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "client");
  const express = require("express");
  app.use(express.static(buildPath));
  app.get("/{*path}", (req: any, res: any) => res.sendFile(path.join(buildPath, "index.html")));
}

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
