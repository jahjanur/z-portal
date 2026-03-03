import nodemailer from "nodemailer";
import prisma from "../lib/prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string | null
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link: link ?? undefined },
  });

  // Send email notification in the background (don't block)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user) {
    transporter
      .sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: `Z-Portal: ${title}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5B4FFF;">${title}</h2>
          <p>Hi ${user.name},</p>
          <p>${message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard"
               style="display: inline-block; padding: 12px 30px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View in Z-Portal
            </a>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This is an automated notification from Z-Portal.
          </p>
        </div>
      `,
      })
      .catch((err) => {
        console.error(`Failed to send notification email to ${user.email}:`, err);
      });
  }

  return notification;
}

/** Create in-app notification only (no email). Used when notifying multiple admins. */
export async function createNotificationInApp(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string | null
) {
  return prisma.notification.create({
    data: { userId, type, title, message, link: link ?? undefined },
  });
}

/** Notify all admin users (in-app only). Use when EraSphere adds client/task etc. */
export async function notifyAdmins(type: string, title: string, message: string, link?: string | null) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) => createNotificationInApp(admin.id, type, title, message, link))
  );
}
