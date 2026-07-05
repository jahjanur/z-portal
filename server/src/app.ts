import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";
import invoiceRoutes from "./routes/invoices";
import usersRoutes from "./routes/users";
import domainsRoutes from "./routes/domains";
import offersRoutes from "./routes/offers";
import timesheetRoutes from "./routes/timesheet";
import projectRoutes from "./routes/projects";
import notificationRoutes from "./routes/notifications";
import workspaceRoutes from "./routes/workspace";
import inviteRoutes from "./routes/invites";
import commentsRoutes from "./routes/comments";
import settingsRoutes from "./routes/settings";
import seoRoutes from "./routes/seo";
import { ensureUploadsDir } from "./lib/uploadsPath";
import filesRoutes from "./routes/files";

ensureUploadsDir();

const app = express();

app.use(cors());
app.use(express.json());

// Protected file serving — replaces the open express.static mount.
// Access is verified per-file based on task ownership / worker assignment.
app.use("/uploads", filesRoutes);

// Production SPA serving. Built assets are served statically; then a browser
// *navigation* (Accept: text/html) to any path returns index.html so deep links
// and refreshes (e.g. /tasks/2, /admin/zulbera/tasks) don't collide with the
// API routes mounted below. XHR/API calls send Accept: application/json and fall
// through to the real API routes.
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require("path");
  const clientDir = nodePath.join(__dirname, "client");
  const indexHtml = nodePath.join(clientDir, "index.html");
  app.use(express.static(clientDir));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/uploads")) return next();
    if (req.accepts(["html", "json"]) === "html") return res.sendFile(indexHtml);
    next();
  });
}

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/tasks", taskRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/domains", domainsRoutes);
app.use("/api/offers", offersRoutes);
app.use("/timesheets", timesheetRoutes);
app.use("/projects", projectRoutes);
app.use("/notifications", notificationRoutes);
app.use("/workspace", workspaceRoutes);
app.use("/invites", inviteRoutes);
app.use("/comments", commentsRoutes);
app.use("/settings", settingsRoutes);
app.use("/seo", seoRoutes);

app.get("/api", (req, res) => res.send("API is running"));

// Global error handler — return JSON instead of leaving the request hanging or
// crashing the process when a route throws unexpectedly.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[express error]", err?.stack || err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: "Server error" });
});

export default app;
