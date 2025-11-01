import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";
import invoiceRoutes from "./routes/invoices";
import usersRoutes from "./routes/users";
import domainsRoutes from "./routes/domains";
import offersRoutes from "./routes/offers";
import timesheetRoutes from "./routes/timesheet";
import projectRoutes from "./routes/projects";

dotenv.config();
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


app.get("/api", (req, res) => res.send("API is running ✅"));

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../client/dist");
  app.use(express.static(buildPath));
  app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));