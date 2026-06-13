// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

const { mockGet, mockPatch } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn() }));
vi.mock("../api", () => ({ default: { get: mockGet, patch: mockPatch } }));

import RoleUser from "../components/Roleuser";

const DAY = 1000 * 60 * 60 * 24;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// One PENDING invoice that is past due (overdue), one PENDING invoice not yet due,
// and one PAID. The overdue one must count ONLY in Overdue, never also in Pending.
const invoices = [
  { id: 1, invoiceNumber: "INV-0001", amount: 500, status: "PENDING", dueDate: inDays(-3) },
  { id: 2, invoiceNumber: "INV-0002", amount: 200, status: "PENDING", dueDate: inDays(10) },
  { id: 3, invoiceNumber: "INV-0003", amount: 50, status: "PAID", dueDate: inDays(-1), paidAt: inDays(-1) },
];

beforeEach(() => {
  localStorage.setItem("userId", "6");
  localStorage.setItem("name", "Sarah");
  mockGet.mockReset();
  mockPatch.mockReset();
  mockPatch.mockResolvedValue({ data: {} });
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith("/tasks")) return Promise.resolve({ data: [] });
    if (url.startsWith("/invoices")) return Promise.resolve({ data: invoices });
    if (url.includes("/domains/client/")) return Promise.resolve({ data: [] });
    if (url.includes("/notifications/unread-count")) return Promise.resolve({ data: { count: 0 } });
    if (url.includes("/notifications")) return Promise.resolve({ data: { notifications: [] } });
    return Promise.resolve({ data: [] });
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("RoleUser invoice summary", () => {
  it("does not double-count an overdue PENDING invoice across Pending and Overdue", async () => {
    render(<MemoryRouter><RoleUser /></MemoryRouter>);

    const heading = await screen.findByText("Invoice Summary");
    const card = heading.closest("section.card-panel") as HTMLElement;
    expect(card).toBeTruthy();

    // Overdue = the $500 past-due PENDING invoice (shown once, with a count badge).
    expect(within(card).getByText("$500.00")).toBeInTheDocument();
    expect(within(card).getByText(/Overdue \(1\)/)).toBeInTheDocument();

    // Pending = only the $200 not-yet-due invoice — NOT $700 (which would be the
    // bug: $500 counted in both Pending and Overdue).
    expect(within(card).getByText("$200.00")).toBeInTheDocument();
    expect(within(card).queryByText("$700.00")).not.toBeInTheDocument();

    // Paid = the $50 invoice.
    expect(within(card).getByText("$50.00")).toBeInTheDocument();
  });
});
