import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: file-comment notifications were routed through the generic emit(),
// which is channel-unaware — it notified the client, all task workers AND admins
// for every file comment. So an INTERNAL (worker-channel) file comment notified
// the client, and a CLIENT-channel file comment notified workers. Routing is now
// channel-isolated (mirrors task comments): internal → admins/workers only,
// client-channel → admins/client only, never the other side.

// Seeded: admin=1, worker1=2, client2=6.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const stamp = Date.now();
const TITLE = `FileNotif ${stamp}`;
const ADMIN_ID = 1;
const WORKER_ID = 2;
const CLIENT_ID = 6;

let taskId: number;
let internalFileId: number;
let clientFileId: number;

beforeAll(async () => {
  const created = await request(app).post("/tasks").set(auth(admin())).send({ title: TITLE, clientId: CLIENT_ID, workerIds: [WORKER_ID] });
  taskId = created.body.id;

  const up1 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set(auth(worker()))
    .field("section", "Deliverables")
    .attach("file", Buffer.from("internal"), `int-${stamp}.txt`);
  internalFileId = up1.body?.id;

  const up2 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set(auth(admin()))
    .field("section", "Deliverables")
    .field("visibleToClient", "true")
    .attach("file", Buffer.from("client"), `cli-${stamp}.txt`);
  clientFileId = up2.body?.id;

  // A: worker comments on the internal file. B: admin comments on the client file.
  await request(app).post(`/tasks/${taskId}/files/${internalFileId}/comments`).set(auth(worker())).send({ content: "internal note" });
  await request(app).post(`/tasks/${taskId}/files/${clientFileId}/comments`).set(auth(admin())).send({ content: "client note" });
});

afterAll(async () => {
  try {
    if (taskId) await request(app).delete(`/tasks/${taskId}`).set(auth(admin()));
    await prisma.notification.deleteMany({ where: { message: { contains: TITLE } } });
  } catch (err) {
    console.error("file-comment-notifications cleanup error:", err);
  }
});

function count(userId: number, threadType: "internal" | "client"): Promise<number> {
  return prisma.notification.count({
    where: { userId, type: "TASK_COMMENT_ADDED", threadType, message: { contains: TITLE } },
  });
}

describe("File comment notifications are channel-isolated", () => {
  it("set up the task, files and comments", () => {
    expect(taskId).toBeTruthy();
    expect(internalFileId).toBeTruthy();
    expect(clientFileId).toBeTruthy();
  });

  it("does NOT notify the client about an internal file comment", async () => {
    expect(await count(CLIENT_ID, "internal")).toBe(0);
  });

  it("does NOT notify task workers about a client-channel file comment", async () => {
    expect(await count(WORKER_ID, "client")).toBe(0);
  });

  it("DOES notify admins about the internal file comment", async () => {
    expect(await count(ADMIN_ID, "internal")).toBeGreaterThanOrEqual(1);
  });

  it("DOES notify the client about the client-channel file comment", async () => {
    expect(await count(CLIENT_ID, "client")).toBeGreaterThanOrEqual(1);
  });
});
