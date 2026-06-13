import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 3, role: "CLIENT" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });

describe("User Routes (/users)", () => {
  describe("GET /users", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/users");
      expect(res.status).toBe(401);
    });

    it("returns 403 for worker role", async () => {
      const res = await request(app).get("/users").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 403 for client role", async () => {
      const res = await request(app).get("/users").set("Authorization", `Bearer ${client()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/users").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /users/erasphere (admin only)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/users/erasphere").set("Authorization", `Bearer ${erasphere()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 for admin", async () => {
      const res = await request(app).get("/users/erasphere").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /users/by-token/:token (public)", () => {
    it("returns 404 for an unknown token", async () => {
      const res = await request(app).get("/users/by-token/not-a-real-token");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /users (create)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/users").send({ email: "a@b.com", password: "secret1", role: "CLIENT", name: "A" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for worker role", async () => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${worker()}`)
        .send({ email: "a@b.com", password: "secret1", role: "CLIENT", name: "A" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/users").set("Authorization", `Bearer ${admin()}`).send({ email: "a@b.com" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /users/:id", () => {
    it("returns 400 for an invalid id", async () => {
      const res = await request(app).get("/users/abc").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing user (admin)", async () => {
      const res = await request(app).get(`/users/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /users/:id (admin only)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app).delete(`/users/${MISSING_ID}`).set("Authorization", `Bearer ${erasphere()}`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing user (admin)", async () => {
      const res = await request(app).delete(`/users/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /users/clients/list", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/users/clients/list");
      expect(res.status).toBe(401);
    });

    it("returns 403 for client role", async () => {
      const res = await request(app).get("/users/clients/list").set("Authorization", `Bearer ${client()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/users/clients/list").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
