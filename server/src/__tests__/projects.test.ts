import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 3, role: "CLIENT" });

describe("Project Routes (/projects)", () => {
  describe("GET /projects", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/projects");
      expect(res.status).toBe(401);
    });

    it("returns 403 for worker role", async () => {
      const res = await request(app).get("/projects").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 403 for client role", async () => {
      const res = await request(app).get("/projects").set("Authorization", `Bearer ${client()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/projects").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /projects", () => {
    it("returns 403 for worker role", async () => {
      const res = await request(app).post("/projects").set("Authorization", `Bearer ${worker()}`).send({ name: "X" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when name is missing", async () => {
      const res = await request(app).post("/projects").set("Authorization", `Bearer ${admin()}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /projects/:id", () => {
    it("returns 404 for a missing project (admin)", async () => {
      const res = await request(app)
        .patch(`/projects/${MISSING_ID}`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ name: "Renamed" });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /projects/:id/status", () => {
    it("returns 400 for an invalid status (admin)", async () => {
      const res = await request(app)
        .patch(`/projects/${MISSING_ID}/status`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ status: "BOGUS" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing project with a valid status (admin)", async () => {
      const res = await request(app)
        .patch(`/projects/${MISSING_ID}/status`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ status: "COMPLETED" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /projects/:id", () => {
    it("returns 403 for worker role", async () => {
      const res = await request(app).delete(`/projects/${MISSING_ID}`).set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for a missing project (admin)", async () => {
      const res = await request(app).delete(`/projects/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });
});
