import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 3, role: "CLIENT" });

describe("Domain Routes (/domains)", () => {
  describe("GET /domains/client/:clientId", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/domains/client/3");
      expect(res.status).toBe(401);
    });

    it("returns 403 when a client requests another client's domains", async () => {
      const res = await request(app).get("/domains/client/999").set("Authorization", `Bearer ${client()}`);
      expect(res.status).toBe(403);
    });

    it("returns 403 for worker role", async () => {
      const res = await request(app).get("/domains/client/3").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/domains/client/3").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /domains/:id (admin only)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app).get(`/domains/${MISSING_ID}`).set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing domain (admin)", async () => {
      const res = await request(app).get(`/domains/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /domains (admin only)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post("/domains")
        .set("Authorization", `Bearer ${worker()}`)
        .send({ clientId: 3, domainName: "x.com" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/domains").set("Authorization", `Bearer ${admin()}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /domains/:id (admin only)", () => {
    it("returns 404 for a missing domain (admin)", async () => {
      const res = await request(app)
        .put(`/domains/${MISSING_ID}`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ domainName: "y.com" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /domains/:id (admin only)", () => {
    it("returns 400 for an invalid id", async () => {
      const res = await request(app).delete("/domains/abc").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing domain (admin)", async () => {
      const res = await request(app).delete(`/domains/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /domains/:id/set-primary (admin only)", () => {
    it("returns 404 for a missing domain (admin)", async () => {
      const res = await request(app).post(`/domains/${MISSING_ID}/set-primary`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });
});
