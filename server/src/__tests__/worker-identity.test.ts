import { describe, it, expect } from "vitest";
import { workerAlias, workerEmoji, maskWorker, maskTaskWorkers } from "../lib/workerIdentity";

describe("worker identity privacy", () => {
  it("derives a stable alias + emoji from the worker id", () => {
    expect(workerAlias(7)).toBe(workerAlias(7));
    expect(workerEmoji(7)).toBe(workerEmoji(7));
    expect(typeof workerAlias(7)).toBe("string");
    expect(workerAlias(7).length).toBeGreaterThan(0);
  });

  it("masks a worker's real name + email, keeping an emoji", () => {
    const masked = maskWorker({ id: 42, name: "Jahja Nuhi", email: "jahja@zulbera.com", role: "WORKER" });
    expect(masked?.name).toBe(workerAlias(42));
    expect(masked?.name).not.toContain("Jahja");
    expect((masked as any)?.email).toBeUndefined();
    expect((masked as any)?.avatarEmoji).toBe(workerEmoji(42));
  });

  it("leaves non-workers (admin/client) untouched", () => {
    const admin = { id: 1, name: "Admin User", email: "admin@test.com", role: "ADMIN" };
    expect(maskWorker(admin)).toEqual(admin);
    const client = { id: 2, name: "Sarah", email: "sarah@acme.com", role: "CLIENT" };
    expect(maskWorker(client)).toEqual(client);
  });

  it("masks workers everywhere they appear in a task payload", () => {
    const task = {
      title: "Logo redesign",
      workers: [{ user: { id: 10, name: "Real Worker", email: "rw@x.com", role: "WORKER" } }],
      comments: [
        { id: 1, content: "hi", user: { id: 10, name: "Real Worker", email: "rw@x.com", role: "WORKER" } },
        { id: 2, content: "client msg", user: { id: 2, name: "Client Name", role: "CLIENT" } },
      ],
      files: [
        {
          id: 1,
          uploader: { id: 10, name: "Real Worker", role: "WORKER" },
          comments: [{ id: 1, user: { id: 10, name: "Real Worker", email: "rw@x.com", role: "WORKER" } }],
        },
      ],
    };

    const masked = maskTaskWorkers(task);
    const alias = workerAlias(10);

    expect(masked.workers[0].user.name).toBe(alias);
    expect(masked.workers[0].user.email).toBeUndefined();
    expect(masked.comments[0].user.name).toBe(alias);
    expect(masked.comments[1].user.name).toBe("Client Name"); // client untouched
    expect(masked.files[0].uploader.name).toBe(alias);
    expect(masked.files[0].comments[0].user.name).toBe(alias);

    // No trace of the real worker name anywhere in the payload.
    expect(JSON.stringify(masked)).not.toContain("Real Worker");
    expect(JSON.stringify(masked)).not.toContain("rw@x.com");
  });
});
