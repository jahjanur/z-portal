import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: EraSphere partners must only mutate tasks belonging to clients
// they referred. Previously PUT/PATCH-status/DELETE on /tasks/:id let any
// EraSphere user edit, restatus, or DELETE ANY task by id (cross-tenant), and
// DELETE on a missing task returned 500 instead of 404.

// Seeded: admin=1, erasphere=4, client2=6 (NOT referred by erasphere 4).
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
let foreignTaskId: number; // task for client 6 (not referred by partner 4)
let referredClientId: number;
let referredTaskId: number; // task for a client referred by partner 4

beforeAll(async () => {
  const t1 = await request(app).post("/tasks").set(auth(admin())).send({ title: `ES foreign ${stamp}`, clientId: 6 });
  foreignTaskId = t1.body.id;

  const refClient = await prisma.user.create({
    data: { email: `es-ref-${stamp}@test.com`, password: "unused", role: "CLIENT", name: "Referred Client", referredById: 4 },
  });
  referredClientId = refClient.id;

  const t2 = await request(app)
    .post("/tasks")
    .set(auth(admin()))
    .send({ title: `ES referred ${stamp}`, clientId: referredClientId });
  referredTaskId = t2.body.id;
});

afterAll(async () => {
  try {
    if (foreignTaskId) await request(app).delete(`/tasks/${foreignTaskId}`).set(auth(admin()));
    if (referredTaskId) await request(app).delete(`/tasks/${referredTaskId}`).set(auth(admin()));
    if (referredClientId) await prisma.user.delete({ where: { id: referredClientId } }).catch(() => {});
  } catch (err) {
    console.error("erasphere-task-authz cleanup error:", err);
  }
});

describe("EraSphere task mutation is scoped to referred clients", () => {
  it("set up a foreign task and a referred task", () => {
    expect(foreignTaskId).toBeTruthy();
    expect(referredTaskId).toBeTruthy();
  });

  it("blocks PATCH /status on a non-referred task (403)", async () => {
    const res = await request(app).patch(`/tasks/${foreignTaskId}/status`).set(auth(erasphere())).send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(403);
  });

  it("blocks PUT on a non-referred task (403)", async () => {
    const res = await request(app).put(`/tasks/${foreignTaskId}`).set(auth(erasphere())).send({ title: "hijacked" });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE on a non-referred task (403)", async () => {
    const res = await request(app).delete(`/tasks/${foreignTaskId}`).set(auth(erasphere()));
    expect(res.status).toBe(403);
  });

  it("allows PATCH /status on a referred task (200)", async () => {
    const res = await request(app).patch(`/tasks/${referredTaskId}/status`).set(auth(erasphere())).send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(200);
  });

  it("allows PUT title on a referred task but ignores admin-only clientId reassignment", async () => {
    const res = await request(app)
      .put(`/tasks/${referredTaskId}`)
      .set(auth(erasphere()))
      .send({ title: `Renamed ${stamp}`, clientId: 6 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(`Renamed ${stamp}`);
    // clientId change is admin-only — the owning client must be unchanged.
    expect(res.body.client.id).toBe(referredClientId);
  });

  it("admin DELETE on a missing task returns 404 (not 500)", async () => {
    const res = await request(app).delete("/tasks/999999999").set(auth(admin()));
    expect(res.status).toBe(404);
  });

  it("admin DELETE with an invalid id returns 400", async () => {
    const res = await request(app).delete("/tasks/abc").set(auth(admin()));
    expect(res.status).toBe(400);
  });
});
