import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getDaysUntilDue, getStatusColor } from "../utils";

const DAY = 1000 * 60 * 60 * 24;

describe("formatDate", () => {
  it("returns 'N/A' for null/undefined/empty", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
    expect(formatDate("")).toBe("N/A");
  });

  it("returns 'Invalid Date' for unparseable input", () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });

  it("formats a valid ISO date with the year (timezone-safe assertion)", () => {
    const out = formatDate("2026-06-13T12:00:00Z");
    expect(out).not.toBe("Invalid Date");
    expect(out).not.toBe("N/A");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Jun/);
  });
});

describe("formatCurrency", () => {
  it("formats USD with two decimals and grouping", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-5)).toBe("-$5.00");
  });
});

describe("getDaysUntilDue", () => {
  it("returns null when no due date is given", () => {
    expect(getDaysUntilDue(null)).toBeNull();
    expect(getDaysUntilDue(undefined)).toBeNull();
  });

  it("returns a positive count for a future date", () => {
    const future = new Date(Date.now() + 10 * DAY).toISOString();
    const days = getDaysUntilDue(future);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThanOrEqual(9);
    expect(days!).toBeLessThanOrEqual(11);
  });

  it("returns a negative count for a past date", () => {
    const past = new Date(Date.now() - 5 * DAY).toISOString();
    expect(getDaysUntilDue(past)!).toBeLessThan(0);
  });
});

describe("getStatusColor", () => {
  it("always returns a themed class string", () => {
    expect(getStatusColor("COMPLETED")).toContain("var(--color-surface-3)");
    expect(getStatusColor(null)).toContain("var(--color-surface-3)");
    expect(getStatusColor("anything")).toContain("text-[var(--color-text-secondary)]");
  });
});
