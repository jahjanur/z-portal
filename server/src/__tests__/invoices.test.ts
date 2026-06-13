import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 3, role: "CLIENT" });

describe("Invoice Routes (/invoices)", () => {
  describe("GET /invoices", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/invoices");
      expect(res.status).toBe(401);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/invoices").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns 200 with an array for client", async () => {
      const res = await request(app).get("/invoices").set("Authorization", `Bearer ${client()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /invoices/:id", () => {
    it("returns 400 for an invalid id", async () => {
      const res = await request(app).get("/invoices/abc").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing invoice", async () => {
      const res = await request(app).get(`/invoices/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /invoices", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/invoices").send({ clientId: 1, dueDate: "2026-01-01" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post("/invoices")
        .set("Authorization", `Bearer ${worker()}`)
        .send({ clientId: 1, dueDate: "2026-01-01" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when clientId/dueDate are missing", async () => {
      const res = await request(app).post("/invoices").set("Authorization", `Bearer ${admin()}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /invoices/:id", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .put(`/invoices/${MISSING_ID}`)
        .set("Authorization", `Bearer ${worker()}`)
        .send({ status: "PAID" });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing invoice (admin)", async () => {
      const res = await request(app)
        .put(`/invoices/${MISSING_ID}`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ status: "PAID" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /invoices/:id", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app).delete(`/invoices/${MISSING_ID}`).set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing invoice (admin)", async () => {
      const res = await request(app).delete(`/invoices/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /invoices/:id/request-payment", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post(`/invoices/${MISSING_ID}/request-payment`)
        .set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing invoice (admin)", async () => {
      const res = await request(app)
        .post(`/invoices/${MISSING_ID}/request-payment`)
        .set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });
});
