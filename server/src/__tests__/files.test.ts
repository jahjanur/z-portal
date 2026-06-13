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
    // resolves outside uploadsDir → rejected (400) or treated as missing (404)
    expect([400, 404]).toContain(res.status);
  });

  // Regression: browsers can't set the Authorization header on <img>/<a> file
  // requests, so the file route must also accept the JWT as a ?token= query param.
  describe("query-param token auth (browser <img>/<a> support)", () => {
    it("accepts a valid token via ?token= (authenticates as admin → 404 for missing file, not 401)", async () => {
      const res = await request(app).get(`/uploads/missing-file-xyz.png?token=${admin()}`);
      expect(res.status).toBe(404);
    });

    it("returns 401 when neither header nor ?token= is present", async () => {
      const res = await request(app).get("/uploads/missing-file-xyz.png");
      expect(res.status).toBe(401);
    });

    it("returns 403 for an invalid ?token=", async () => {
      const res = await request(app).get("/uploads/missing-file-xyz.png?token=garbage");
      expect(res.status).toBe(403);
    });

    it("serves nested invoice paths through the same route (admin → 404 for missing)", async () => {
      const res = await request(app).get(`/uploads/invoices/missing-invoice-xyz.pdf?token=${admin()}`);
      expect(res.status).toBe(404);
    });
  });
});
