"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// .env is also preloaded by "npm run dev" via node -r dotenv/config so it's set before Prisma is used
dotenv_1.default.config();
if (process.env.NODE_ENV === "production") {
    // Load from server/.env.production so it works regardless of cwd (e.g. in Docker)
    const productionEnv = path_1.default.join(__dirname, "..", ".env.production");
    dotenv_1.default.config({ path: productionEnv, override: true });
}
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Create server/.env from server/.env.example and set DATABASE_URL.");
    process.exit(1);
}
const app_1 = __importDefault(require("./app"));
const domainRenewalReminder_1 = require("./jobs/domainRenewalReminder");
(0, domainRenewalReminder_1.scheduleDomainRenewalReminders)();
if (process.env.NODE_ENV === "production") {
    const buildPath = path_1.default.join(__dirname, "client");
    const express = require("express");
    app_1.default.use(express.static(buildPath));
    app_1.default.get("/{*path}", (req, res) => res.sendFile(path_1.default.join(buildPath, "index.html")));
}
const PORT = process.env.PORT || 4001;
app_1.default.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map