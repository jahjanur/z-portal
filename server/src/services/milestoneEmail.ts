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

interface MilestoneDoneEmailOpts {
  to: string;
  clientName?: string | null;
  taskId: number;
  taskTitle: string;
  milestoneTitle: string;
  done: number;
  total: number;
}

/** Notify the client by email that a milestone was completed, with overall progress. */
export async function sendMilestoneDoneEmail(opts: MilestoneDoneEmailOpts): Promise<void> {
  if (!transporter) return; // SMTP not configured (e.g. local dev) — skip silently
  const percent = opts.total ? Math.round((opts.done / opts.total) * 100) : 0;
  const complete = opts.total > 0 && opts.done >= opts.total;

  const html = renderEmail({
    badge: { text: complete ? "All milestones done" : "Milestone completed", tone: complete ? "success" : "info" },
    tone: complete ? "success" : "info",
    heading: complete ? "All milestones are complete 🎉" : "A milestone was completed",
    greeting: opts.clientName ? `Hi ${opts.clientName},` : undefined,
    intro: `<p>Progress was made on your task <strong>${escapeHtml(opts.taskTitle)}</strong>.</p>`,
    rows: [
      { label: "Task", value: escapeHtml(opts.taskTitle) },
      { label: "Completed", value: escapeHtml(opts.milestoneTitle) },
      { label: "Progress", value: `${opts.done}/${opts.total} · ${percent}%` },
    ],
    cta: { label: "View task", url: `${CLIENT_URL}/tasks/${opts.taskId}` },
    note: complete
      ? "Every milestone on this task is now done."
      : "You'll get an update as the remaining milestones are completed.",
  });

  await transporter.sendMail({
    from: `"Zulbera" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: complete
      ? `All milestones complete — ${opts.taskTitle}`
      : `Milestone completed — ${opts.taskTitle}`,
    html,
    attachments: [logoAttachment()],
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
