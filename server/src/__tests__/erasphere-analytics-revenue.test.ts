import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: "pending/outstanding revenue" in the EraSphere analytics endpoints
// was computed as status === "PENDING", which excluded OVERDUE invoices (a status
// an admin can set via the invoice edit modal). That undercounted outstanding
// revenue and broke reconciliation (paid + pending != total) — and it disagreed
// with the EraSphere sidebar (workspace) which used status !== "PAID". Now all
// three agree on "outstanding = not paid".

// Seeded: admin=1, erasphere=4.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
let clientId: number;
const invoiceIds: number[] = [];

async function mkInvoice(amount: number, status?: string): Promise<number> {
  const res = await request(app)
    .post("/invoices")
    .set(auth(admin()))
    .send({ clientId, amount, dueDate: "2026-12-31", description: `analytics ${stamp}` });
  const id = res.body.id;
  if (status && status !== "PENDING") {
    await request(app).put(`/invoices/${id}`).set(auth(admin())).send({ status });
  }
  return id;
}

beforeAll(async () => {
  const c = await prisma.user.create({
    data: { email: `analytics-ref-${stamp}@test.com`, password: "unused", role: "CLIENT", name: "Analytics Ref", referredById: 4 },
  });
  clientId = c.id;

  invoiceIds.push(await mkInvoice(100, "PENDING"));
  invoiceIds.push(await mkInvoice(200, "OVERDUE"));
  invoiceIds.push(await mkInvoice(50, "PAID"));
});

afterAll(async () => {
  try {
    for (const id of invoiceIds) await request(app).delete(`/invoices/${id}`).set(auth(admin()));
    if (clientId) {
      await prisma.invoice.deleteMany({ where: { clientId } });
      await prisma.user.delete({ where: { id: clientId } }).catch(() => {});
    }
  } catch (err) {
    console.error("erasphere-analytics-revenue cleanup error:", err);
  }
});

describe("EraSphere analytics outstanding revenue counts every unpaid invoice", () => {
  it("reconciles paid + pending = total and includes OVERDUE in pending", async () => {
    const res = await request(app).get("/users/erasphere/analytics").set(auth(erasphere()));
    expect(res.status).toBe(200);
    const { totalRevenue, paidRevenue, pendingRevenue } = res.body.stats;

    // Our three invoices: 100 PENDING + 200 OVERDUE + 50 PAID.
    expect(totalRevenue).toBe(350);
    expect(paidRevenue).toBe(50);
    // Outstanding must include the OVERDUE invoice → 300, not just the 100 PENDING.
    expect(pendingRevenue).toBe(300);
    // And the books must reconcile.
    expect(paidRevenue + pendingRevenue).toBe(totalRevenue);
  });
});
