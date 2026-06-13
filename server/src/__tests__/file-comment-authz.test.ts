import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Regression: POST /tasks/:taskId/files/:fileId/comments must enforce channel
// isolation and role authorization. A worker may only comment on internal
// (worker-channel) files; a client only on client-channel files; an EraSphere
// partner only on tasks for clients they referred. Comments inherit the file's
// channel. Previously the endpoint checked task assignment only — a worker could
// comment on a client-channel file (and vice-versa), EraSphere was unrestricted,
// and content wasn't validated.

// Seeded users (prisma/seed.ts): admin=1, worker1=2, erasphere=4, client2=6.
const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const worker = () => makeToken({ userId: 2, role: "WORKER" });
const client = () => makeToken({ userId: 6, role: "CLIENT" });
const erasphere = () => makeToken({ userId: 4, role: "ERASPHERE" });

const stamp = Date.now();
const CLIENT_ID = 6;
const WORKER_ID = 2;

let taskId: number;
let internalFileId: number;
let clientFileId: number;

beforeAll(async () => {
  const created = await request(app)
    .post("/tasks")
    .set("Authorization", `Bearer ${admin()}`)
    .send({ title: `File Comment ${stamp}`, clientId: CLIENT_ID, workerIds: [WORKER_ID] });
  taskId = created.body.id;

  const up1 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set("Authorization", `Bearer ${worker()}`)
    .field("section", "Deliverables")
    .attach("file", Buffer.from("internal"), `int-${stamp}.txt`);
  internalFileId = up1.body?.id;

  const up2 = await request(app)
    .post(`/tasks/${taskId}/files`)
    .set("Authorization", `Bearer ${admin()}`)
    .field("section", "Deliverables")
    .field("visibleToClient", "true")
    .attach("file", Buffer.from("client"), `cli-${stamp}.txt`);
  clientFileId = up2.body?.id;
});

afterAll(async () => {
  try {
    if (taskId) await request(app).delete(`/tasks/${taskId}`).set("Authorization", `Bearer ${admin()}`);
    await prisma.notification.deleteMany({ where: { message: { contains: String(stamp) } } });
  } catch (err) {
    console.error("file-comment-authz cleanup error:", err);
  }
});

const postFileComment = (token: string, fileId: number, body: object) =>
  request(app)
    .post(`/tasks/${taskId}/files/${fileId}/comments`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);

describe("File comment authorization + channel isolation", () => {
  it("set up the task and both files", () => {
    expect(taskId).toBeTruthy();
    expect(internalFileId).toBeTruthy();
    expect(clientFileId).toBeTruthy();
  });

  it("rejects an empty comment with 400", async () => {
    const res = await postFileComment(worker(), internalFileId, { content: "   " });
    expect(res.status).toBe(400);
  });

  it("lets a worker comment on an internal file (inherits worker channel)", async () => {
    const res = await postFileComment(worker(), internalFileId, { content: "worker note" });
    expect(res.status).toBe(201);
    expect(res.body.visibleToClient).toBe(false);
  });

  it("blocks a worker from commenting on a client-channel file (403)", async () => {
    const res = await postFileComment(worker(), clientFileId, { content: "sneaky" });
    expect(res.status).toBe(403);
  });

  it("lets a client comment on a client-channel file (inherits client channel)", async () => {
    const res = await postFileComment(client(), clientFileId, { content: "client note" });
    expect(res.status).toBe(201);
    expect(res.body.visibleToClient).toBe(true);
  });

  it("blocks a client from commenting on an internal file (403)", async () => {
    const res = await postFileComment(client(), internalFileId, { content: "peek" });
    expect(res.status).toBe(403);
  });

  it("blocks an EraSphere partner from commenting on a non-referred task's file (403)", async () => {
    const res = await postFileComment(erasphere(), clientFileId, { content: "nope" });
    expect(res.status).toBe(403);
  });

  it("blocks an EraSphere partner from commenting on a non-referred task (403)", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${erasphere()}`)
      .send({ content: "nope" });
    expect(res.status).toBe(403);
  });
});
