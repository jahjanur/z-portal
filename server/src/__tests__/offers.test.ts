import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { makeToken } from "./helpers";

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });

const validOffer = {
  clientName: "Test Client",
  clientEmail: "client@example.com",
  pageTitle: "Project Proposal",
  description: "A description of the work.",
  products: [],
  totalPrice: 0,
};

describe("Offer Routes (/api/offers)", () => {
  describe("POST /api/offers/send-offer", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/api/offers/send-offer").send(validOffer);
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post("/api/offers/send-offer")
        .set("Authorization", `Bearer ${worker()}`)
        .send(validOffer);
      expect(res.status).toBe(403);
    });

    it("returns 400 when clientEmail is missing", async () => {
      const res = await request(app)
        .post("/api/offers/send-offer")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ ...validOffer, clientEmail: undefined });
      expect(res.status).toBe(400);
    });

    it("returns 400 when products is not an array", async () => {
      const res = await request(app)
        .post("/api/offers/send-offer")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ ...validOffer, products: "nope" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/offers/download", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app).post("/api/offers/download").send(validOffer);
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      const res = await request(app)
        .post("/api/offers/download")
        .set("Authorization", `Bearer ${worker()}`)
        .send(validOffer);
      expect(res.status).toBe(403);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/offers/download")
        .set("Authorization", `Bearer ${admin()}`)
        .send({ products: [] });
      expect(res.status).toBe(400);
    });

    it("returns a PDF for a valid request (admin)", async () => {
      const res = await request(app)
        .post("/api/offers/download")
        .set("Authorization", `Bearer ${admin()}`)
        .send(validOffer);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
    });
  });
});
