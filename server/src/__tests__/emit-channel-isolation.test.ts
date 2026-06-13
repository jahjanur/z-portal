import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { emit, EventType } from "../services/notificationEngine";
import { makeToken } from "./helpers";

// Defense-in-depth: the routing matrix for TASK_COMMENT_ADDED / TASK_FILE_UPLOADED
// targets client + workers + admins and is channel-unaware. emit() now enforces
// channel isolation as a safety net so that even a direct call cannot leak an
// internal (worker-channel) notification to the client, or a client-channel one
// to the task's workers.

// Seeded: admin=1, worker1=2, client2=6.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
const INTERNAL_MSG = `emit-internal-${stamp}`;
const CLIENT_MSG = `emit-client-${stamp}`;
const ADMIN_ID = 1;
const WORKER_ID = 2;
const CLIENT_ID = 6;
let taskId: number;

beforeAll(async () => {
  const t = await request(app).post("/tasks").set(auth(admin())).send({ title: `Emit ${stamp}`, clientId: CLIENT_ID, workerIds: [WORKER_ID] });
  taskId = t.body.id;

  // Internal-channel event authored by the worker.
  await emit(EventType.TASK_COMMENT_ADDED, {
    title: "Internal", message: INTERNAL_MSG, taskId, threadType: "internal", actorId: WORKER_ID,
  });
  // Client-channel event authored by an admin.
  await emit(EventType.TASK_COMMENT_ADDED, {
    title: "Client", message: CLIENT_MSG, taskId, threadType: "client", actorId: ADMIN_ID,
  });
});

afterAll(async () => {
  try {
    if (taskId) await request(app).delete(`/tasks/${taskId}`).set(auth(admin()));
    await prisma.notification.deleteMany({ where: { message: { contains: String(stamp) } } });
  } catch (err) {
    console.error("emit-channel-isolation cleanup error:", err);
  }
});

const count = (userId: number, message: string) => prisma.notification.count({ where: { userId, message } });

describe("emit() enforces channel isolation as a safety net", () => {
  it("set up the task", () => {
    expect(taskId).toBeTruthy();
  });

  it("an internal-channel emit never reaches the client", async () => {
    expect(await count(CLIENT_ID, INTERNAL_MSG)).toBe(0);
  });

  it("an internal-channel emit still reaches admins", async () => {
    expect(await count(ADMIN_ID, INTERNAL_MSG)).toBeGreaterThanOrEqual(1);
  });

  it("a client-channel emit never reaches task workers", async () => {
    expect(await count(WORKER_ID, CLIENT_MSG)).toBe(0);
  });

  it("a client-channel emit still reaches the client", async () => {
    expect(await count(CLIENT_ID, CLIENT_MSG)).toBeGreaterThanOrEqual(1);
  });
});
