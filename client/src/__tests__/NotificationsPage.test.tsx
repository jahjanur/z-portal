// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

// Mock the axios instance so the page can be driven end-to-end without a network.
const { mockGet, mockPatch } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn() }));
vi.mock("../api", () => ({ default: { get: mockGet, patch: mockPatch } }));

import NotificationsPage from "../pages/NotificationsPage";

const now = new Date().toISOString();
const pageOne = {
  data: {
    notifications: [
      { id: 1, type: "TASK_ASSIGNED", title: "Assigned to Alpha", message: "You were assigned", read: false, link: "/tasks/1", createdAt: now },
      { id: 2, type: "INVOICE_PAID", title: "Invoice paid", message: "Invoice was paid", read: true, link: null, createdAt: now },
    ],
    total: 3, page: 1, limit: 20, totalPages: 2,
  },
};

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
  mockPatch.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

const renderPage = () => render(<MemoryRouter><NotificationsPage /></MemoryRouter>);

describe("NotificationsPage", () => {
  it("loads and renders notifications from the API", async () => {
    mockGet.mockResolvedValue(pageOne);
    renderPage();
    expect(await screen.findByText("Assigned to Alpha")).toBeInTheDocument();
    expect(screen.getByText("Invoice paid")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/notifications?page=1&limit=20");
  });

  it("requests the next page when a page button is clicked", async () => {
    mockGet.mockResolvedValue(pageOne);
    renderPage();
    await screen.findByText("Assigned to Alpha");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/notifications?page=2&limit=20"));
  });

  it("marks all notifications as read via the API", async () => {
    mockGet.mockResolvedValue(pageOne);
    renderPage();
    await screen.findByText("Assigned to Alpha");
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith("/notifications/read-all"));
  });

  it("shows an empty state when there are no notifications", async () => {
    mockGet.mockResolvedValue({ data: { notifications: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
    renderPage();
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });
});
