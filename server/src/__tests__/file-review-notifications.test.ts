import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: reviewing a file must respect channel isolation. A review of an
// INTERNAL (worker-channel, visibleToClient=false) file must NOT notify the
// client, who cannot see that file. A review of a CLIENT-channel file SHOULD
// notify the client. Previously every review notified the client regardless of
// the file's channel, leaking internal activity.

// Seeded users (prisma/seed.ts): admin=1, worker1=2, client2=6.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });

const stamp = Date.now();
const INTERNAL_FILE = `internal-${stamp}.txt`;
const CLIENT_FILE = `clientfile-${stamp}.txt`;
const CLIENT_ID = 6;
const WORKER_ID = 2;

let taskId: number;
let internalFileId: number;
let clientFileId: number;

beforeAll(async () => {
  const created = await request(app)
    .post("/tasks")
    .set("Authorization", `Bearer ${admin()}`)
    .send({ title: `File Review ${stamp}`, clientId: CLIENT_ID, workerIds: [WORKER_ID] });
  taskId = created.body.id;

  // Worker uploads an internal (worker-channel) file.
  const up1 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set("Authorization", `Bearer ${worker()}`)
    .field("section", "Deliverables")
    .attach("file", Buffer.from("internal content"), INTERNAL_FILE);
  internalFileId = up1.body?.id;

  // Admin uploads a client-channel file.
  const up2 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set("Authorization", `Bearer ${admin()}`)
    .field("section", "Deliverables")
    .field("visibleToClient", "true")
    .attach("file", Buffer.from("client content"), CLIENT_FILE);
  clientFileId = up2.body?.id;

  // Admin reviews both with NEEDS_REVISION (comment required).
  await request(app)
    .patch(`/tasks/${taskId}/files/${internalFileId}/review`)
    .set("Authorization", `Bearer ${admin()}`)
    .send({ status: "NEEDS_REVISION", comment: "internal: please fix" });

  await request(app)
    .patch(`/tasks/${taskId}/files/${clientFileId}/review`)
    .set("Authorization", `Bearer ${admin()}`)
    .send({ status: "NEEDS_REVISION", comment: "client: please fix" });
});

afterAll(async () => {
  try {
    if (taskId) await request(app).delete(`/tasks/${taskId}`).set("Authorization", `Bearer ${admin()}`);
    await prisma.notification.deleteMany({ where: { message: { contains: String(stamp) } } });
  } catch (err) {
    console.error("file-review-notifications cleanup error:", err);
  }
});

async function notifCount(userId: number, fileName: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, type: "TASK_FILE_REVIEWED", message: { contains: fileName } },
  });
}

describe("File review notifications respect channel isolation", () => {
  it("set up the task and both files", () => {
    expect(taskId).toBeTruthy();
    expect(internalFileId).toBeTruthy();
    expect(clientFileId).toBeTruthy();
  });

  it("does NOT notify the client about an internal-file review", async () => {
    expect(await notifCount(CLIENT_ID, INTERNAL_FILE)).toBe(0);
  });

  it("still notifies the worker (uploader) about their internal-file review", async () => {
    expect(await notifCount(WORKER_ID, INTERNAL_FILE)).toBeGreaterThanOrEqual(1);
  });

  it("DOES notify the client about a client-channel file review", async () => {
    expect(await notifCount(CLIENT_ID, CLIENT_FILE)).toBeGreaterThanOrEqual(1);
  });
});
