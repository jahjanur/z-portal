import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken, MISSING_ID } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });

describe("Timesheet Routes (/timesheets)", () => {
  describe("GET /timesheets/projects", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).get("/timesheets/projects");
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app).get("/timesheets/projects").set("Authorization", `Bearer ${worker()}`);
      expect(res.status).toBe(403);
    });

    it("returns 200 with an array for admin", async () => {
      const res = await request(app).get("/timesheets/projects").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /timesheets/projects/:id", () => {
    it("returns 400 for an invalid id", async () => {
      const res = await request(app).get("/timesheets/projects/abc").set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing project", async () => {
      const res = await request(app).get(`/timesheets/projects/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /timesheets/projects", () => {
    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post("/timesheets/projects")
        .set("Authorization", `Bearer ${worker()}`)
        .send({ projectName: "X" });
      expect(res.status).toBe(403);
    });

    it("returns 400 when projectName is missing", async () => {
      const res = await request(app)
        .post("/timesheets/projects")
        .set("Authorization", `Bearer ${admin()}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /timesheets/projects/:id/entries", () => {
    it("returns 400 for an invalid project id", async () => {
      const res = await request(app)
        .post("/timesheets/projects/abc/entries")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ date: "2026-01-01", hoursWorked: 1, hourlyRate: 1 });
      expect(res.status).toBe(400);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/timesheets/projects/1/entries")
        .set("Authorization", `Bearer ${admin()}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 for a missing project", async () => {
      const res = await request(app)
        .post(`/timesheets/projects/${MISSING_ID}/entries`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ date: "2026-01-01", hoursWorked: 1, hourlyRate: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe("entry/project mutations on missing records (404, not 500)", () => {
    it("PATCH /timesheets/entries/:id returns 404 for a missing entry", async () => {
      const res = await request(app)
        .patch(`/timesheets/entries/${MISSING_ID}`)
        .set("Authorization", `Bearer ${admin()}`)
        .send({ notes: "x" });
      expect(res.status).toBe(404);
    });

    it("DELETE /timesheets/entries/:id returns 404 for a missing entry", async () => {
      const res = await request(app).delete(`/timesheets/entries/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });

    it("DELETE /timesheets/projects/:id returns 404 for a missing project", async () => {
      const res = await request(app).delete(`/timesheets/projects/${MISSING_ID}`).set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });

    it("PATCH /timesheets/projects/:id/mark-paid returns 404 for a missing project", async () => {
      const res = await request(app)
        .patch(`/timesheets/projects/${MISSING_ID}/mark-paid`)
        .set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });

    it("PATCH /timesheets/projects/:id/mark-unpaid returns 404 for a missing project", async () => {
      const res = await request(app)
        .patch(`/timesheets/projects/${MISSING_ID}/mark-unpaid`)
        .set("Authorization", `Bearer ${admin()}`);
      expect(res.status).toBe(404);
    });
  });
});
