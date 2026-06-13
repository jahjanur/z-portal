import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const user = () => makeToken({ userId: 1, role: "ADMIN" });

describe("Notification Routes (/notifications)", () => {
  describe("GET /notifications", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/notifications");
      expect(res.status).toBe(401);
    });

    it("returns 200 with a notifications array for an authenticated user", async () => {
      const res = await request(app).get("/notifications").set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/notifications/unread-count");
      expect(res.status).toBe(401);
    });

    it("returns 200 with a numeric count", async () => {
      const res = await request(app).get("/notifications/unread-count").set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe("number");
    });
  });

  describe("GET /notifications/unread-by-task", () => {
    it("returns 400 when taskId is missing", async () => {
      const res = await request(app).get("/notifications/unread-by-task").set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /notifications/read-all", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).patch("/notifications/read-all");
      expect(res.status).toBe(401);
    });

    it("returns 200 for an authenticated user", async () => {
      const res = await request(app).patch("/notifications/read-all").set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("returns 404 for a missing notification", async () => {
      const res = await request(app).patch(`/notifications/${MISSING_ID}/read`).set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("notification preferences", () => {
    it("GET /notifications/preferences returns 200 with an array", async () => {
      const res = await request(app).get("/notifications/preferences").set("Authorization", `Bearer ${user()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("PATCH /notifications/preferences returns 400 when body is not an array", async () => {
      const res = await request(app)
        .patch("/notifications/preferences")
        .set("Authorization", `Bearer ${user()}`)
        .send({ not: "an array" });
      expect(res.status).toBe(400);
    });
  });
});
