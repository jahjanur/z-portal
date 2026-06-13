import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });

describe("Workspace Routes (/workspace)", () => {
  describe("GET /workspace/overview (admin only)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/workspace/overview");
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/workspace/overview").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with overview counts for admin", async () => {
      const res = await request(app).get("/workspace/overview").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.workers).toBe("number");
      expect(typeof res.body.clients).toBe("number");
      expect(typeof res.body.activeTasks).toBe("number");
    });
  });

  describe("GET /workspace/erasphere-overview (admin only)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/workspace/erasphere-overview").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with partner stats for admin", async () => {
      const res = await request(app).get("/workspace/erasphere-overview").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.partners).toBe("number");
      expect(typeof res.body.totalTasks).toBe("number");
    });
  });
});
