import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

// Regression: the admin/EraSphere client detail page calls
// GET /tasks?clientId=X and GET /invoices?clientId=X. The server used to ignore
// the query param and return EVERY client's records, so one client's detail page
// showed all clients' tasks/invoices. These tests lock in server-side filtering.

const admin = () => makeToken({ userId: 1, role: "ADMIN" });

describe("Client-scoped list filtering (?clientId=)", () => {
  it("GET /tasks?clientId=X returns only that client's tasks (matches a client-side filter of the full list)", async () => {
    const token = admin();
    const all = await request(app).get("/tasks").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);

    // Pick a clientId that actually has tasks, if any exist.
    const someClientId: number | undefined = all.body.find((t: any) => t.clientId != null)?.clientId;
    if (someClientId == null) return; // no tasks seeded — nothing to assert

    const filtered = await request(app)
      .get(`/tasks?clientId=${someClientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(filtered.status).toBe(200);

    // Every returned task must belong to the requested client.
    expect(filtered.body.every((t: any) => t.clientId === someClientId)).toBe(true);

    // And it must equal the subset of the full list for that client (no leakage, no loss).
    const expected = all.body.filter((t: any) => t.clientId === someClientId).map((t: any) => t.id).sort();
    const actual = filtered.body.map((t: any) => t.id).sort();
    expect(actual).toEqual(expected);
  });

  it("GET /tasks?clientId=<missing> returns an empty array", async () => {
    const res = await request(app).get(`/tasks?clientId=${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /invoices?clientId=X returns only that client's invoices", async () => {
    const token = admin();
    const all = await request(app).get("/invoices").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);

    const someClientId: number | undefined = all.body.find((i: any) => i.clientId != null)?.clientId;
    if (someClientId == null) return;

    const filtered = await request(app)
      .get(`/invoices?clientId=${someClientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.every((i: any) => i.clientId === someClientId)).toBe(true);

    const expected = all.body.filter((i: any) => i.clientId === someClientId).map((i: any) => i.id).sort();
    const actual = filtered.body.map((i: any) => i.id).sort();
    expect(actual).toEqual(expected);
  });

  it("GET /invoices?clientId=<missing> returns an empty array", async () => {
    const res = await request(app).get(`/invoices?clientId=${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
