import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });

describe("File Routes (/uploads)", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/uploads/whatever.png");
    expect(res.status).toBe(401);
  });

  it("returns 403 for an invalid token", async () => {
    const res = await request(app).get("/uploads/whatever.png").set("Authorization", "Bearer bad");
    expect(res.status).toBe(403);
  });

  it("returns 404 for a file that does not exist (admin)", async () => {
    const res = await request(app)
      .get("/uploads/this-file-does-not-exist-12345.png")
      .set("Authorization", `Bearer ${admin()}`);
    expect(res.status).toBe(404);
  });

  it("does not leak files outside uploads via path traversal", async () => {
    const res = await request(app)
      .get("/uploads/..%2F..%2Fpackage.json")
      .set("Authorization", `Bearer ${admin()}`);
    // path is basename-sanitized, so it resolves to a non-existent upload → 404
    expect([400, 404]).toContain(res.status);
  });
});
