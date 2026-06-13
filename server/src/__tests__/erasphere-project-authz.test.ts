import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: POST /projects let an EraSphere partner create a project for ANY
// clientId. Since the list/edit/delete endpoints scope partners to referred
// clients, such a project would be invisible and unmanageable to them (orphan).
// Partners may now only create projects for clients they referred, the client
// is validated, and admins get a 400 on a bogus client id.

// Seeded: admin=1, erasphere=4, client2=6 (NOT referred by partner 4).
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
let referredClientId: number;
const createdProjectIds: number[] = [];

beforeAll(async () => {
  const refClient = await prisma.user.create({
    data: { email: `proj-ref-${stamp}@test.com`, password: "unused", role: "CLIENT", name: "Proj Referred", referredById: 4 },
  });
  referredClientId = refClient.id;
});

afterAll(async () => {
  try {
    for (const pid of createdProjectIds) {
      await request(app).delete(`/projects/${pid}`).set(auth(admin()));
    }
    if (referredClientId) {
      await prisma.project.deleteMany({ where: { clientId: referredClientId } });
      await prisma.user.delete({ where: { id: referredClientId } }).catch(() => {});
    }
  } catch (err) {
    console.error("erasphere-project-authz cleanup error:", err);
  }
});

describe("EraSphere project creation is scoped to referred clients", () => {
  it("rejects an EraSphere project with no client (400)", async () => {
    const res = await request(app).post("/projects").set(auth(erasphere())).send({ name: `P ${stamp}` });
    expect(res.status).toBe(400);
  });

  it("blocks an EraSphere project for a non-referred client (403)", async () => {
    const res = await request(app)
      .post("/projects")
      .set(auth(erasphere()))
      .send({ name: `P ${stamp}`, clientId: 6 });
    expect(res.status).toBe(403);
  });

  it("allows an EraSphere project for a referred client (201)", async () => {
    const res = await request(app)
      .post("/projects")
      .set(auth(erasphere()))
      .send({ name: `P referred ${stamp}`, clientId: referredClientId });
    expect(res.status).toBe(201);
    expect(res.body.clientId).toBe(referredClientId);
    if (res.body.id) createdProjectIds.push(res.body.id);
  });

  it("rejects an admin project with a non-existent client id (400)", async () => {
    const res = await request(app)
      .post("/projects")
      .set(auth(admin()))
      .send({ name: `P ${stamp}`, clientId: 999999999 });
    expect(res.status).toBe(400);
  });

  it("allows an admin project for a valid client (201)", async () => {
    const res = await request(app)
      .post("/projects")
      .set(auth(admin()))
      .send({ name: `P admin ${stamp}`, clientId: 6 });
    expect(res.status).toBe(201);
    if (res.body.id) createdProjectIds.push(res.body.id);
  });
});
