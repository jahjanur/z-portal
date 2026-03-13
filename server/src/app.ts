import express from "express";
import cors from "cors";
import path from "path";
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

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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

app.get("/api", (req, res) => res.send("API is running"));

export default app;
