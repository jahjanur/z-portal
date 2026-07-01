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

interface ResetEmailOpts {
  to: string;
  name?: string | null;
  token: string;
  /** True when an admin started the reset (vs the user via "forgot password"). */
  byAdmin?: boolean;
  /** Human-readable link lifetime, e.g. "1 hour". */
  expiresLabel?: string;
}

/** Email a user a link to choose a new password. Returns false if SMTP is off. */
export async function sendPasswordResetEmail(opts: ResetEmailOpts): Promise<boolean> {
  if (!transporter) return false;

  const url = `${CLIENT_URL}/reset-password?token=${opts.token}`;
  const expires = opts.expiresLabel || "1 hour";

  const html = renderEmail({
    badge: { text: "Password reset" },
    heading: "Reset your password",
    greeting: opts.name ? `Hi ${opts.name},` : undefined,
    intro: opts.byAdmin
      ? `<p>Your Zulbera administrator started a password reset for your account. Click the button below to choose a new password and get back in.</p>`
      : `<p>We received a request to reset the password for your Zulbera account. Click the button below to choose a new one.</p>`,
    cta: { label: "Set a new password", url },
    note: `This link expires in ${expires}. If you didn't expect this, you can safely ignore this email — your current password stays active.`,
  });

  await transporter.sendMail({
    from: `"Zulbera" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: "Reset your Zulbera password",
    html,
    attachments: [logoAttachment()],
  });
  return true;
}
