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
import { ensureUploadsDir } from "./lib/uploadsPath";
import filesRoutes from "./routes/files";

ensureUploadsDir();

const app = express();

app.use(cors());
app.use(express.json());

// Protected file serving — replaces the open express.static mount.
// Access is verified per-file based on task ownership / worker assignment.
app.use("/uploads", filesRoutes);

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

app.get("/api", (req, res) => res.send("API is running"));

// Global error handler — return JSON instead of leaving the request hanging or
// crashing the process when a route throws unexpectedly.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[express error]", err?.stack || err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: "Server error" });
});

export default app;
