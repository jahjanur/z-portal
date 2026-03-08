import cron from "node-cron";
import prisma from "../lib/prisma";
import { sendDomainRenewalReminderEmail } from "../services/notifications";

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

/** Schedule daily at 9:00 AM. */
export function scheduleDomainRenewalReminders(): void {
  cron.schedule("0 9 * * *", () => {
    runDomainRenewalReminders().catch((err) =>
      console.error("Domain renewal reminder job error:", err)
    );
  });
  console.log("Domain renewal reminder cron scheduled (daily at 9:00 AM).");
}
