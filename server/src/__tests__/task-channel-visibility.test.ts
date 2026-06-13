import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: GET /tasks (list) must apply the same two-channel visibility as
// GET /tasks/:id. Internal worker-channel comments/files (visibleToClient=false)
// must never appear in a CLIENT's list payload, and client-channel content must
// not appear for a WORKER. Previously the list endpoint returned ALL comments
// and files unfiltered, leaking internal threads into the client dashboard.

// Seeded users (see prisma/seed.ts): admin=1, worker1=2, client2=6.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 6, role: "CLIENT" });

const stamp = Date.now();
const INTERNAL = `INTERNAL-worker-note-${stamp}`;
const CLIENT_VISIBLE = `CLIENT-visible-note-${stamp}`;
let taskId: number;

beforeAll(async () => {
  const created = await request(app)
    .post("/tasks")
    .set("Authorization", `Bearer ${admin()}`)
    .send({ title: `Channel Vis ${stamp}`, clientId: 6, workerIds: [2] });
  taskId = created.body.id;

  // Worker posts an internal (worker-channel) comment.
  await request(app)
    .post(`/tasks/${taskId}/comments`)
    .set("Authorization", `Bearer ${worker()}`)
    .send({ content: INTERNAL, visibleToClient: false });

  // Admin posts a client-channel comment.
  await request(app)
    .post(`/tasks/${taskId}/comments`)
    .set("Authorization", `Bearer ${admin()}`)
    .send({ content: CLIENT_VISIBLE, visibleToClient: true });
});

afterAll(async () => {
  try {
    if (taskId) {
      await request(app).delete(`/tasks/${taskId}`).set("Authorization", `Bearer ${admin()}`);
      await prisma.notification.deleteMany({ where: { taskId } });
    }
  } catch (err) {
    console.error("channel-visibility cleanup error:", err);
  }
});

function findTaskComments(body: any[], id: number): string[] {
  const t = body.find((x) => x.id === id);
  return (t?.comments ?? []).map((c: any) => c.content);
}

describe("GET /tasks two-channel visibility", () => {
  it("setup created the task and both comments", () => {
    expect(taskId).toBeTruthy();
  });

  it("CLIENT list sees the client-channel comment but NOT the internal one", async () => {
    const res = await request(app).get("/tasks").set("Authorization", `Bearer ${client()}`);
    expect(res.status).toBe(200);
    const contents = findTaskComments(res.body, taskId);
    expect(contents).toContain(CLIENT_VISIBLE);
    expect(contents).not.toContain(INTERNAL);
  });

  it("WORKER list sees the internal comment but NOT the client-channel one", async () => {
    const res = await request(app).get("/tasks").set("Authorization", `Bearer ${worker()}`);
    expect(res.status).toBe(200);
    const contents = findTaskComments(res.body, taskId);
    expect(contents).toContain(INTERNAL);
    expect(contents).not.toContain(CLIENT_VISIBLE);
  });

  it("ADMIN list sees both channels", async () => {
    const res = await request(app).get("/tasks").set("Authorization", `Bearer ${admin()}`);
    expect(res.status).toBe(200);
    const contents = findTaskComments(res.body, taskId);
    expect(contents).toContain(INTERNAL);
    expect(contents).toContain(CLIENT_VISIBLE);
  });
});
