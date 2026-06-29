import nodemailer from "nodemailer";
import { renderEmail } from "./emailTemplate";
import { logoAttachment } from "./logoAsset";

const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

interface TodosCompleteEmailOpts {
  to: string;
  clientName?: string | null;
  taskId: number;
  taskTitle: string;
  done: number;
  total: number;
}

/** Email the client that every to-do on a task is complete (100%). */
export async function sendMilestoneDoneEmail(opts: TodosCompleteEmailOpts): Promise<void> {
  if (!transporter) return; // SMTP not configured (e.g. local dev) — skip silently

  const html = renderEmail({
    badge: { text: "All to-dos complete", tone: "success" },
    tone: "success",
    heading: "All to-dos are complete 🎉",
    greeting: opts.clientName ? `Hi ${opts.clientName},` : undefined,
    intro: `<p>Every to-do on your task <strong>${escapeHtml(opts.taskTitle)}</strong> has been completed — it's <strong>100% done</strong>.</p>`,
    rows: [
      { label: "Task", value: escapeHtml(opts.taskTitle) },
      { label: "To-dos", value: `${opts.done}/${opts.total} · 100%` },
    ],
    cta: { label: "View task", url: `${CLIENT_URL}/tasks/${opts.taskId}` },
    note: "Your team will follow up on the next steps.",
  });

  await transporter.sendMail({
    from: `"Zulbera" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `All to-dos complete — ${opts.taskTitle}`,
    html,
    attachments: [logoAttachment()],
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
