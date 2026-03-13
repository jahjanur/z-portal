import nodemailer from "nodemailer";

const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

function zulberaEmailTemplate(opts: {
  heading: string;
  greeting: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  footer?: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 3px solid #5B4FFF;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #0b0f14; letter-spacing: -0.5px;">Zulbera</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #0b0f14;">${opts.heading}</h2>
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">${opts.greeting}</p>
        <div style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">${opts.body}</div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${opts.ctaUrl}"
             style="display: inline-block; padding: 14px 36px; background-color: #5B4FFF; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
            ${opts.ctaText}
          </a>
        </div>
        ${opts.footer || ""}
      </div>
      <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Zulbera &middot; Z-Portal &middot; Secure Client Management
        </p>
      </div>
    </div>
  `;
}

interface InviteEmailOpts {
  to: string;
  name: string;
  role: string;
  company: string | null;
  inviteLink: string;
  expiresInHours: number;
}

export async function sendInviteEmail(opts: InviteEmailOpts): Promise<void> {
  const { to, name, role, company, inviteLink, expiresInHours } = opts;
  const firstName = name.split(" ")[0];

  let heading: string;
  let bodyText: string;
  let ctaText = "Accept Invitation & Set Up Your Account";

  switch (role) {
    case "WORKER":
      heading = "You've been invited to join Zulbera";
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          Zulbera has invited you to join Z-Portal as a <strong>Worker</strong>.
          You'll be able to view and manage assigned tasks, upload deliverables, and track deadlines.
        </p>
      `;
      break;
    case "ERASPHERE":
      heading = "You've been invited to the EraSphere Partner Program";
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          You've been invited to join the <strong>EraSphere Partner Program</strong> on Z-Portal.
          As a partner, you can refer clients, manage their projects, and track your revenue through a dedicated dashboard.
        </p>
      `;
      break;
    default:
      heading = `Zulbera has created a workspace for ${company || "you"}`;
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          Zulbera has set up a workspace for ${company ? `<strong>${company}</strong>` : "you"} on Z-Portal.
          You'll be able to track your projects, view invoices, monitor domain status, and communicate with the team.
        </p>
      `;
      break;
  }

  const footer = `
    <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
      This link expires in ${expiresInHours} hours. If you didn't expect this invitation, you can safely ignore it.
    </p>
  `;

  const html = zulberaEmailTemplate({
    heading,
    greeting: `Hi ${firstName},`,
    body: bodyText,
    ctaText,
    ctaUrl: inviteLink,
    footer,
  });

  if (!transporter) {
    console.log(`[INVITE LINK - NO SMTP]: ${inviteLink}`);
    console.log(`  Recipient: ${to} (${role})`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `Zulbera — ${heading}`,
    html,
  });
  console.log(`✅ Invite email sent to ${to} (role: ${role})`);
}

export async function sendWelcomeEmailForRole(
  role: string,
  user: { email: string; name: string; company: string | null }
): Promise<void> {
  const firstName = user.name.split(" ")[0];
  let heading: string;
  let bodyText: string;

  switch (role) {
    case "WORKER":
      heading = "Welcome to the Zulbera Team!";
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          Your account has been set up. You can now log in to view tasks, upload deliverables, and track your work.
        </p>
      `;
      break;
    case "ERASPHERE":
      heading = "Welcome to EraSphere!";
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          Your EraSphere partner account is ready. Log in to your dashboard to manage referred clients and track revenue.
        </p>
      `;
      break;
    default:
      heading = `Welcome to Zulbera${user.company ? `, ${user.company}` : ""}!`;
      bodyText = `
        <p style="margin: 0 0 12px; color: #374151; font-size: 15px;">
          Your workspace is ready. Log in to track your projects, view invoices, and manage your domain information.
        </p>
      `;
      break;
  }

  const html = zulberaEmailTemplate({
    heading,
    greeting: `Hi ${firstName},`,
    body: bodyText,
    ctaText: "Go to Dashboard",
    ctaUrl: `${CLIENT_URL}/login`,
  });

  if (!transporter) {
    console.log(`[WELCOME EMAIL - NO SMTP]: ${user.email} (${role})`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: `Zulbera — ${heading}`,
    html,
  });
  console.log(`✅ Welcome email sent to ${user.email} (role: ${role})`);
}

export { zulberaEmailTemplate };
