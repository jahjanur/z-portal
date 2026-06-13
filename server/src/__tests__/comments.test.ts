import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });

describe("Comment Routes (/comments)", () => {
  describe("GET /comments/recent (admin only)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/comments/recent");
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/comments/recent").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with a comments array for admin", async () => {
      const res = await request(app).get("/comments/recent").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    it("supports the threadFilter query param", async () => {
      const res = await request(app)
        .get("/comments/recent")
        .query({ threadFilter: "client" })
        .set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.comments)).toBe(true);
    });
  });
});
