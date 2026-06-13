import { describe, it, expect } from "vitest";
import { toneForStatus } from "../components/ui/StatusBadge";

// The central status → tone mapping drives badge colors across the whole app.
describe("toneForStatus", () => {
  it("maps task statuses", () => {
    expect(toneForStatus("PENDING")).toBe("warning");
    expect(toneForStatus("IN_PROGRESS")).toBe("info");
    expect(toneForStatus("COMPLETED")).toBe("success");
    expect(toneForStatus("CANCELLED")).toBe("neutral");
  });

  it("maps invoice/domain statuses", () => {
    expect(toneForStatus("PAID")).toBe("success");
    expect(toneForStatus("OVERDUE")).toBe("danger");
    expect(toneForStatus("ACTIVE")).toBe("success");
    expect(toneForStatus("EXPIRED")).toBe("danger");
  });

  it("normalizes spaces and hyphens to underscores", () => {
    expect(toneForStatus("in progress")).toBe("info");
    expect(toneForStatus("needs-changes")).toBe("warning");
  });

  it("falls back to neutral for unknown or missing status", () => {
    expect(toneForStatus(null)).toBe("neutral");
    expect(toneForStatus(undefined)).toBe("neutral");
    expect(toneForStatus("SOMETHING_RANDOM")).toBe("neutral");
  });
});
