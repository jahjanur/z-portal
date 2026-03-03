import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("Auth Routes", () => {
  describe("POST /auth/login", () => {
    it("returns 400 when email or password is missing", async () => {
      const res = await request(app).post("/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email and password required");
    });

    it("returns 400 when only email is provided", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email and password required");
    });

    it("returns 401 for invalid credentials", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password: "wrongpass" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });
  });

  describe("GET /auth/verify", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/auth/verify");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("No token provided");
    });

    it("returns 401 for an invalid token", async () => {
      const res = await request(app)
        .get("/auth/verify")
        .set("Authorization", "Bearer invalidtoken123");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid token");
    });
  });

  describe("GET /api", () => {
    it("returns health check message", async () => {
      const res = await request(app).get("/api");
      expect(res.status).toBe(200);
      expect(res.text).toContain("API is running");
    });
  });
});
