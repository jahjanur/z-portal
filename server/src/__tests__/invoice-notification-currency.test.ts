import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: invoice notifications used "€" while the invoice emails, the
// client invoice UI, and formatCurrency all use "$" — so a user saw their
// invoice as "$500.00" everywhere except the notification ("500.00 €"). The
// notification messages must match the rest of the invoice feature ("$").

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

let invoiceId: number;
let invoiceNumber: string;

beforeAll(async () => {
  const res = await request(app)
    .post("/invoices")
    .set(auth(admin()))
    .send({ clientId: 6, dueDate: "2026-12-31", amount: 500, description: "currency test" });
  invoiceId = res.body.id;
  invoiceNumber = res.body.invoiceNumber;
});

afterAll(async () => {
  try {
    if (invoiceId) await request(app).delete(`/invoices/${invoiceId}`).set(auth(admin()));
    if (invoiceNumber) await prisma.notification.deleteMany({ where: { message: { contains: invoiceNumber } } });
  } catch (err) {
    console.error("invoice-notification-currency cleanup error:", err);
  }
});

async function messagesFor(invNum: string): Promise<string[]> {
  const rows = await prisma.notification.findMany({ where: { message: { contains: invNum } } });
  return rows.map((r) => r.message);
}

describe("Invoice notifications use the same currency symbol as the rest of the feature ($)", () => {
  it("created an invoice", () => {
    expect(invoiceId).toBeTruthy();
    expect(invoiceNumber).toBeTruthy();
  });

  it("the INVOICE_CREATED notification uses $ and not €", async () => {
    const msgs = await messagesFor(invoiceNumber);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    for (const m of msgs) {
      expect(m).not.toContain("€");
      expect(m).toContain("$500.00");
    }
  });

  it("the INVOICE_PAID notification uses $ and not €", async () => {
    await request(app).put(`/invoices/${invoiceId}`).set(auth(admin())).send({ status: "PAID" });
    const paidMsgs = (await messagesFor(invoiceNumber)).filter((m) => m.includes("marked as paid"));
    expect(paidMsgs.length).toBeGreaterThanOrEqual(1);
    for (const m of paidMsgs) {
      expect(m).not.toContain("€");
      expect(m).toContain("$500.00");
    }
  });
});
