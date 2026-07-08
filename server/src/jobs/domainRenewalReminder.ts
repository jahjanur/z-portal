import cron from "node-cron";
import prisma from "../lib/prisma";
import { sendDomainRenewalReminderEmail, sendServerRenewalReminderEmail } from "../services/notifications";

const clientSelect = {
  id: true,
  name: true,
  company: true,
  email: true,
};

/**
 * Find domains expiring in ~30 days that haven't had a renewal reminder sent,
 * send the reminder email, and set renewalReminderSentAt (and optionally RENEWAL_DUE).
 */
export async function runDomainRenewalReminders(): Promise<void> {
  const now = new Date();
  const inThirtyOneDays = new Date(now);
  inThirtyOneDays.setDate(inThirtyOneDays.getDate() + 31);

  const domains = await prisma.domain.findMany({
    where: {
      expirationDate: { gt: now, lte: inThirtyOneDays },
      renewalReminderSentAt: null,
    },
    include: { client: { select: clientSelect } },
  });

  for (const domain of domains) {
    if (!domain.client || !("email" in domain.client)) continue;
    try {
      await sendDomainRenewalReminderEmail(domain, {
        email: (domain.client as { email: string }).email,
        name: domain.client.name,
      });
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          renewalReminderSentAt: new Date(),
          status: "RENEWAL_DUE",
        },
      });
    } catch (err) {
      console.error(`Domain renewal reminder failed for domain ${domain.id}:`, err);
    }
  }
}

/**
 * Notify the client + all admins (in-app) about hosting plans expiring within
 * ~30 days. Deduped by checking for an existing notification for that domain in
 * the last 25 days (so it doesn't fire every day).
 */
export async function runHostingExpiryReminders(): Promise<void> {
  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 25);

  const domains = await prisma.domain.findMany({
    where: { hostingExpiry: { gt: now, lte: in30 } },
    include: { client: { select: { id: true, name: true } } },
  });
  if (domains.length === 0) return;

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });

  for (const domain of domains) {
    if (!domain.hostingExpiry) continue;
    const dateStr = domain.hostingExpiry.toLocaleDateString();
    const provider = domain.hostingProvider ? ` (${domain.hostingProvider})` : "";
    const message = `Hosting for ${domain.domainName}${provider} expires on ${dateStr}`;
    const recipients: { userId: number; link: string }[] = [
      { userId: domain.clientId, link: "/dashboard?tab=domains" },
      ...admins.map((a) => ({ userId: a.id, link: "/admin/zulbera/domains" })),
    ];

    for (const r of recipients) {
      try {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: r.userId,
            type: "DOMAIN_HOSTING_EXPIRING",
            message: { contains: domain.domainName },
            createdAt: { gt: cutoff },
          },
          select: { id: true },
        });
        if (existing) continue;
        await prisma.notification.create({
          data: {
            userId: r.userId,
            type: "DOMAIN_HOSTING_EXPIRING",
            title: "Hosting expiring soon",
            message,
            link: r.link,
            read: false,
          },
        });
      } catch (err) {
        console.error(`Hosting expiry reminder failed for domain ${domain.id}, user ${r.userId}:`, err);
      }
    }
  }
}

/**
 * Find servers expiring in ~2 weeks (15 days) that haven't had a renewal
 * reminder sent, email the client that their services will stop working soon,
 * and set renewalReminderSentAt + RENEWAL_DUE.
 */
export async function runServerRenewalReminders(): Promise<void> {
  const now = new Date();
  const inFifteenDays = new Date(now);
  inFifteenDays.setDate(inFifteenDays.getDate() + 15);

  const servers = await prisma.server.findMany({
    where: {
      expirationDate: { gt: now, lte: inFifteenDays },
      renewalReminderSentAt: null,
    },
    include: { client: { select: clientSelect } },
  });

  for (const server of servers) {
    if (!server.client || !("email" in server.client)) continue;
    try {
      await sendServerRenewalReminderEmail(server, {
        email: (server.client as { email: string }).email,
        name: server.client.name,
      });
      await prisma.server.update({
        where: { id: server.id },
        data: {
          renewalReminderSentAt: new Date(),
          status: "RENEWAL_DUE",
        },
      });
    } catch (err) {
      console.error(`Server renewal reminder failed for server ${server.id}:`, err);
    }
  }
}

/** Schedule daily at 9:00 AM. */
export function scheduleDomainRenewalReminders(): void {
  cron.schedule("0 9 * * *", () => {
    runDomainRenewalReminders().catch((err) =>
      console.error("Domain renewal reminder job error:", err)
    );
    runHostingExpiryReminders().catch((err) =>
      console.error("Hosting expiry reminder job error:", err)
    );
    runServerRenewalReminders().catch((err) =>
      console.error("Server renewal reminder job error:", err)
    );
  });
  console.log("Domain + hosting + server renewal reminder cron scheduled (daily at 9:00 AM).");
}
