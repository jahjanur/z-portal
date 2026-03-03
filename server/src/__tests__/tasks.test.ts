import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

function makeToken(payload: { userId: number; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

describe("Task Routes", () => {
  describe("GET /tasks", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/tasks");
      expect(res.status).toBe(401);
    });

    it("returns 403 with invalid token", async () => {
      const res = await request(app)
        .get("/tasks")
        .set("Authorization", "Bearer invalidtoken");
      expect(res.status).toBe(403);
    });

    it("returns tasks for authenticated admin", async () => {
      const token = makeToken({ userId: 1, role: "ADMIN" });
      const res = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${token}`);
      // Should return 200 with an array (might be empty in test DB)
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /tasks", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/tasks").send({ title: "Test" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin users", async () => {
      const token = makeToken({ userId: 2, role: "WORKER" });
      const res = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Test Task", clientId: 1 });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Only admins can create tasks");
    });

    it("returns 403 for client role", async () => {
      const token = makeToken({ userId: 3, role: "CLIENT" });
      const res = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Test Task", clientId: 3 });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Only admins can create tasks");
    });

    it("returns 400 when title is missing", async () => {
      const token = makeToken({ userId: 1, role: "ADMIN" });
      const res = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ clientId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title and clientId are required");
    });

    it("returns 400 when clientId is missing", async () => {
      const token = makeToken({ userId: 1, role: "ADMIN" });
      const res = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Test Task" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title and clientId are required");
    });
  });

  describe("PATCH /tasks/:id/status", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .patch("/tasks/1/status")
        .send({ status: "IN_PROGRESS" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for client role", async () => {
      const token = makeToken({ userId: 3, role: "CLIENT" });
      // This will either return 403 (client can't update) or 404 (task not found)
      const res = await request(app)
        .patch("/tasks/999999/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("returns 403 for non-admin users", async () => {
      const token = makeToken({ userId: 2, role: "WORKER" });
      const res = await request(app)
        .delete("/tasks/1")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Only admins can delete tasks");
    });
  });
});
