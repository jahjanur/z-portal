import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: GET /invoices/:id gated WORKER and CLIENT but not ERASPHERE, so a
// partner could fetch ANY invoice by id — including clients they never referred
// (cross-tenant financial data leak). Partners may now only read invoices of
// clients they referred.

// Seeded: admin=1, erasphere=4, client2=6 (NOT referred by partner 4).
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
let referredClientId: number;
let referredInvoiceId: number; // invoice for a client referred by partner 4
let foreignInvoiceId: number; // invoice for client 6 (not referred)

beforeAll(async () => {
  const refClient = await prisma.user.create({
    data: { email: `inv-ref-${stamp}@test.com`, password: "unused", role: "CLIENT", name: "Inv Referred", referredById: 4 },
  });
  referredClientId = refClient.id;

  const inv1 = await request(app)
    .post("/invoices")
    .set(auth(admin()))
    .send({ clientId: referredClientId, dueDate: "2026-12-31", amount: 100, description: `ref ${stamp}` });
  referredInvoiceId = inv1.body.id;

  const inv2 = await request(app)
    .post("/invoices")
    .set(auth(admin()))
    .send({ clientId: 6, dueDate: "2026-12-31", amount: 200, description: `foreign ${stamp}` });
  foreignInvoiceId = inv2.body.id;
});

afterAll(async () => {
  try {
    if (referredInvoiceId) await request(app).delete(`/invoices/${referredInvoiceId}`).set(auth(admin()));
    if (foreignInvoiceId) await request(app).delete(`/invoices/${foreignInvoiceId}`).set(auth(admin()));
    if (referredClientId) await prisma.user.delete({ where: { id: referredClientId } }).catch(() => {});
  } catch (err) {
    console.error("erasphere-invoice-authz cleanup error:", err);
  }
});

describe("EraSphere invoice read access is scoped to referred clients", () => {
  it("set up referred + foreign invoices", () => {
    expect(referredInvoiceId).toBeTruthy();
    expect(foreignInvoiceId).toBeTruthy();
  });

  it("blocks a partner from reading a non-referred client's invoice (403)", async () => {
    const res = await request(app).get(`/invoices/${foreignInvoiceId}`).set(auth(erasphere()));
    expect(res.status).toBe(403);
  });

  it("allows a partner to read a referred client's invoice (200)", async () => {
    const res = await request(app).get(`/invoices/${referredInvoiceId}`).set(auth(erasphere()));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(referredInvoiceId);
  });

  it("still allows admin to read any invoice (200)", async () => {
    const res = await request(app).get(`/invoices/${foreignInvoiceId}`).set(auth(admin()));
    expect(res.status).toBe(200);
  });
});
