// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

const { mockGet, mockPatch } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn() }));
vi.mock("../api", () => ({ default: { get: mockGet, patch: mockPatch } }));

import RoleUser from "../components/Roleuser";

const DAY = 1000 * 60 * 60 * 24;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// Server returns the Domain model field `expirationDate` (NOT `domainExpiry`).
const domains = [
  {
    id: 1,
    domainName: "example.com",
    expirationDate: inDays(10), // expiring within 30 days
    isPrimary: true,
    isActive: true,
    status: "ACTIVE",
    notes: null,
    createdAt: inDays(-100),
  },
];

beforeEach(() => {
  localStorage.setItem("userId", "6");
  localStorage.setItem("name", "Sarah");
  mockGet.mockReset();
  mockPatch.mockReset();
  mockPatch.mockResolvedValue({ data: {} });
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith("/tasks")) return Promise.resolve({ data: [] });
    if (url.startsWith("/invoices")) return Promise.resolve({ data: [] });
    if (url.includes("/domains/client/")) return Promise.resolve({ data: domains });
    if (url.includes("/notifications/unread-count")) return Promise.resolve({ data: { count: 0 } });
    if (url.includes("/notifications")) return Promise.resolve({ data: { notifications: [] } });
    return Promise.resolve({ data: [] });
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("RoleUser domains tab", () => {
  it("renders the domain expiry date and warning from the server's expirationDate field", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=domains"]}>
        <RoleUser />
      </MemoryRouter>
    );

    // The primary-domain card shows the expiry — proving expirationDate is read
    // (previously the client read a non-existent `domainExpiry` and showed nothing).
    expect(await screen.findByText(/Domain expires:/)).toBeInTheDocument();
    // 10 days out → "Expiring soon" badge appears (in the primary card and list).
    expect(screen.getAllByText(/Expiring soon/).length).toBeGreaterThanOrEqual(1);
  });
});
