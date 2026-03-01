"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const users_1 = __importDefault(require("./routes/users"));
const domains_1 = __importDefault(require("./routes/domains"));
const offers_1 = __importDefault(require("./routes/offers"));
const timesheet_1 = __importDefault(require("./routes/timesheet"));
const projects_1 = __importDefault(require("./routes/projects"));
// .env is also preloaded by "npm run dev" via node -r dotenv/config so it's set before Prisma is used
dotenv_1.default.config();
if (process.env.NODE_ENV === "production") {
    dotenv_1.default.config({ path: ".env.production", override: true });
}
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Create server/.env from server/.env.example and set DATABASE_URL.");
    process.exit(1);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.use("/tasks", tasks_1.default);
app.use("/invoices", invoices_1.default);
app.use("/domains", domains_1.default);
app.use("/api/offers", offers_1.default);
app.use("/timesheets", timesheet_1.default);
app.use("/projects", projects_1.default);
app.get("/api", (req, res) => res.send("API is running ✅"));
if (process.env.NODE_ENV === "production") {
    const buildPath = path_1.default.join(__dirname, "client");
    app.use(express_1.default.static(buildPath));
    app.get("*", (req, res) => res.sendFile(path_1.default.join(buildPath, "index.html")));
}
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map