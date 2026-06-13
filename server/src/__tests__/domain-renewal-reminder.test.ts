import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { runDomainRenewalReminders } from "../jobs/domainRenewalReminder";

// Regression for the scheduled domain-renewal reminder job: it must remind only
// domains expiring within ~30 days that haven't already been reminded, set
// renewalReminderSentAt + status RENEWAL_DUE, and never touch domains that are
// far out, already expired, or already reminded (idempotency).

const DAY = 1000 * 60 * 60 * 24;
const CLIENT_ID = 6; // seeded client2
const STAMP = Date.now();

let dueSoonId: number;
let farOutId: number;
let alreadySentId: number;
let expiredId: number;
const alreadySentAt = new Date(STAMP - 2 * DAY);

// Snapshot pre-existing domains so the global job run leaves seeded rows untouched.
let snapshot = new Map<number, { renewalReminderSentAt: Date | null; status: string }>();

async function mkDomain(name: string, expiresInDays: number, reminded: Date | null): Promise<number> {
  const d = await prisma.domain.create({
    data: {
      clientId: CLIENT_ID,
      domainName: name,
      status: "ACTIVE",
      expirationDate: new Date(STAMP + expiresInDays * DAY),
      renewalReminderSentAt: reminded,
    },
    select: { id: true },
  });
  return d.id;
}

beforeAll(async () => {
  const pre = await prisma.domain.findMany({ select: { id: true, renewalReminderSentAt: true, status: true } });
  snapshot = new Map(pre.map((d) => [d.id, { renewalReminderSentAt: d.renewalReminderSentAt, status: d.status }]));

  dueSoonId = await mkDomain(`due-soon-${STAMP}.com`, 15, null);
  farOutId = await mkDomain(`far-out-${STAMP}.com`, 60, null);
  alreadySentId = await mkDomain(`already-${STAMP}.com`, 15, alreadySentAt);
  expiredId = await mkDomain(`expired-${STAMP}.com`, -5, null);

  await runDomainRenewalReminders();
});

afterAll(async () => {
  try {
    await prisma.domain.deleteMany({ where: { id: { in: [dueSoonId, farOutId, alreadySentId, expiredId] } } });
    // Restore any pre-existing domain the global job run mutated.
    const after = await prisma.domain.findMany({
      where: { id: { in: [...snapshot.keys()] } },
      select: { id: true, renewalReminderSentAt: true, status: true },
    });
    for (const d of after) {
      const orig = snapshot.get(d.id);
      if (!orig) continue;
      if (String(d.renewalReminderSentAt) !== String(orig.renewalReminderSentAt) || d.status !== orig.status) {
        await prisma.domain.update({ where: { id: d.id }, data: orig }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("domain-renewal-reminder cleanup error:", err);
  }
});

const get = (id: number) => prisma.domain.findUnique({ where: { id } });

describe("runDomainRenewalReminders", () => {
  it("reminds a domain expiring within ~30 days and marks it RENEWAL_DUE", async () => {
    const d = await get(dueSoonId);
    expect(d?.renewalReminderSentAt).not.toBeNull();
    expect(d?.status).toBe("RENEWAL_DUE");
  });

  it("does not remind a domain that expires far in the future", async () => {
    const d = await get(farOutId);
    expect(d?.renewalReminderSentAt).toBeNull();
    expect(d?.status).toBe("ACTIVE");
  });

  it("does not re-remind a domain that was already reminded (idempotent)", async () => {
    const d = await get(alreadySentId);
    expect(d?.renewalReminderSentAt?.getTime()).toBe(alreadySentAt.getTime());
    expect(d?.status).toBe("ACTIVE");
  });

  it("does not remind an already-expired domain", async () => {
    const d = await get(expiredId);
    expect(d?.renewalReminderSentAt).toBeNull();
  });
});
