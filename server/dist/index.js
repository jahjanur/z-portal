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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.use("/tasks", tasks_1.default);
app.use("/invoices", invoices_1.default);
// Test route
app.get("/api", (req, res) => res.send("API is running ✅"));
// Serve frontend in production
if (process.env.NODE_ENV === "production") {
    const buildPath = path_1.default.join(__dirname, "../client/dist");
    app.use(express_1.default.static(buildPath));
    app.get("*", (req, res) => res.sendFile(path_1.default.join(buildPath, "index.html")));
}
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map