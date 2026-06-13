import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken } from "./helpers";

// Contract test: the Domain API exposes the expiry as `expirationDate`. The
// client dashboard and admin client-detail page read exactly this field (a
// previous bug had them reading a non-existent `domainExpiry`, so clients never
// saw their domain expiry). This locks the field name so a server-side rename
// can't silently re-break the client domain display.

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
const CLIENT_ID = 6; // seeded client2
let domainId: number;

beforeAll(async () => {
  const res = await request(app)
    .post("/domains")
    .set(auth(admin()))
    .send({ clientId: CLIENT_ID, domainName: `contract-${stamp}.com`, status: "ACTIVE", expirationDate: "2026-12-31", lifespanYears: 1 });
  domainId = res.body?.id;
});

afterAll(async () => {
  if (domainId) await request(app).delete(`/domains/${domainId}`).set(auth(admin()));
});

describe("Domain API exposes expiry as expirationDate", () => {
  it("created the domain", () => {
    expect(domainId).toBeTruthy();
  });

  it("GET /domains/:id returns expirationDate (and not domainExpiry)", async () => {
    const res = await request(app).get(`/domains/${domainId}`).set(auth(admin()));
    expect(res.status).toBe(200);
    expect(res.body.expirationDate).toBeTruthy();
    expect(res.body).not.toHaveProperty("domainExpiry");
  });

  it("GET /domains/client/:clientId returns expirationDate on each domain", async () => {
    const res = await request(app).get(`/domains/client/${CLIENT_ID}`).set(auth(admin()));
    expect(res.status).toBe(200);
    const created = res.body.find((d: any) => d.id === domainId);
    expect(created).toBeTruthy();
    expect(created.expirationDate).toBeTruthy();
    expect(created).not.toHaveProperty("domainExpiry");
  });
});
