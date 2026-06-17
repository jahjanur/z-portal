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

// Resilience: a stray async error must not take the whole server down (which would
// cause a Docker restart and make users hit a transient failure). Log and keep serving.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

import app from "./app";
import { scheduleDomainRenewalReminders } from "./jobs/domainRenewalReminder";

scheduleDomainRenewalReminders();

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
