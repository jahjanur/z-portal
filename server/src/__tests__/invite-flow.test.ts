import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";
import { makeToken } from "./helpers";

// Integration: the full client-onboarding lifecycle that the admin invite UI and
// the public InviteAcceptPage depend on — create invite → validate → accept →
// log in → confirm the invite can't be reused. Runs against the live test DB and
// cleans up the user/invite it creates so it leaves no residue.

const admin = () => makeToken({ userId: 1, role: "ADMIN" });
const EMAIL = `invite-flow-${Date.now()}@test.com`;
let createdUserId: number | null = null;

afterAll(async () => {
  try {
    if (createdUserId != null) {
      // Reuse the app's cascade-aware delete to clear notifications/etc.
      await request(app).delete(`/users/${createdUserId}`).set("Authorization", `Bearer ${admin()}`);
    }
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.invite.deleteMany({ where: { email: EMAIL } });
  } catch (err) {
    // best-effort cleanup; don't fail the suite on teardown
    console.error("invite-flow cleanup error:", err);
  }
  // Note: prisma is a shared singleton across suites — do NOT $disconnect here.
});

describe("Invite → accept → login lifecycle", () => {
  let rawToken: string;

  it("admin creates an invite and gets a usable invite link", async () => {
    const res = await request(app)
      .post("/invites")
      .set("Authorization", `Bearer ${admin()}`)
      .send({ email: EMAIL, name: "Invite Flow", role: "CLIENT", company: "FlowCo" });
    expect(res.status).toBe(201);
    expect(res.body.inviteLink).toBeTruthy();
    const token = new URL(res.body.inviteLink).searchParams.get("token");
    expect(token).toBeTruthy();
    rawToken = token as string;
  });

  it("the invite token validates publicly with the invitee details", async () => {
    const res = await request(app).get("/invites/validate").query({ token: rawToken });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(EMAIL);
    expect(res.body.role).toBe("CLIENT");
  });

  it("accepting the invite creates the account and returns an auth token", async () => {
    const res = await request(app).post("/invites/accept").send({ token: rawToken, password: "flowpass123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.email).toBe(EMAIL);
    expect(res.body.user?.role).toBe("CLIENT");
    createdUserId = res.body.user?.id ?? null;
    expect(createdUserId).not.toBeNull();
  });

  it("the new user can log in with their chosen password", async () => {
    const res = await request(app).post("/auth/login").send({ email: EMAIL, password: "flowpass123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.email).toBe(EMAIL);
  });

  it("a used invite cannot be accepted again (410)", async () => {
    const res = await request(app).post("/invites/accept").send({ token: rawToken, password: "flowpass123" });
    expect(res.status).toBe(410);
  });
});
