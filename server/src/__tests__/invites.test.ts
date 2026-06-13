import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 3, role: "CLIENT" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });

describe("Invite Routes", () => {
  describe("POST /invites (create)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/invites").send({ email: "a@b.com", name: "A", role: "CLIENT" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for worker role", async () => {
      const res = await request(app)
        .post("/invites")
        .set("Authorization", `Bearer ${worker()}`)
        .send({ email: "a@b.com", name: "A", role: "CLIENT" });
      expect(res.status).toBe(403);
    });

    it("returns 403 for client role", async () => {
      const res = await request(app)
        .post("/invites")
        .set("Authorization", `Bearer ${client()}`)
        .send({ email: "a@b.com", name: "A", role: "CLIENT" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/invites")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ email: "a@b.com" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for an invalid role", async () => {
      const res = await request(app)
        .post("/invites")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ email: "a@b.com", name: "A", role: "SUPERUSER" });
      expect(res.status).toBe(400);
    });

    it("returns 403 when EraSphere tries to invite a WORKER", async () => {
      const res = await request(app)
        .post("/invites")
        .set("Authorization", `Bearer ${erasphere()}`)
        .send({ email: "a@b.com", name: "A", role: "WORKER" });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /invites (list, admin only)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/invites");
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/invites").set("Authorization", `Bearer ${erasphere()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/invites").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /invites/validate (public)", () => {
    it("returns 400 when token is missing", async () => {
      const res = await request(app).get("/invites/validate");
      expect(res.status).toBe(400);
    });

    it("returns 404 for an unknown token", async () => {
      const res = await request(app).get("/invites/validate").query({ token: "nope-not-real" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /invites/accept (public)", () => {
    it("returns 400 when token/password are missing", async () => {
      const res = await request(app).post("/invites/accept").send({});
      expect(res.status).toBe(400);
    });

    it("returns 400 for a too-short password", async () => {
      const res = await request(app).post("/invites/accept").send({ token: "x", password: "123" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for an unknown token", async () => {
      const res = await request(app).post("/invites/accept").send({ token: "unknown-token", password: "longenough" });
      expect(res.status).toBe(404);
    });
  });

  describe("invite actions on missing records", () => {
    it("resend returns 404 for a missing invite (admin)", async () => {
      const res = await request(app).post(`/invites/${MISSING_ID}/resend`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });

    it("cancel returns 404 for a missing invite (admin)", async () => {
      const res = await request(app).post(`/invites/${MISSING_ID}/cancel`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /invites/for-role/:role", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/invites/for-role/CLIENT");
      expect(res.status).toBe(401);
    });

    it("returns 400 for an invalid role (admin)", async () => {
      const res = await request(app).get("/invites/for-role/BOGUS").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(400);
    });

    it("returns 403 when EraSphere requests a non-CLIENT role", async () => {
      const res = await request(app).get("/invites/for-role/WORKER").set("Authorization", `Bearer ${erasphere()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/invites/for-role/CLIENT").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
