// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("../api", () => ({ default: { get: mockGet } }));

import RoleWorker from "../components/Roleworker";

const DAY = 1000 * 60 * 60 * 24;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

// 5 tasks chosen so each overview stat has a distinct, checkable value:
//   Total=5, In Progress=2, Overdue=1 (Gamma), Due This Week=1 (Beta).
const tasks = [
  { id: 1, title: "Alpha", status: "IN_PROGRESS", dueDate: inDays(10), createdAt: inDays(-1) },
  { id: 2, title: "Beta", status: "PENDING", dueDate: inDays(3), createdAt: inDays(-1) },
  { id: 3, title: "Gamma", status: "PENDING", dueDate: inDays(-5), createdAt: inDays(-1) },
  { id: 4, title: "Delta", status: "COMPLETED", dueDate: inDays(-2), createdAt: inDays(-1) },
  { id: 5, title: "Epsilon", status: "IN_PROGRESS", dueDate: inDays(20), createdAt: inDays(-1) },
];

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockResolvedValue({ data: tasks });
});
afterEach(cleanup);

const renderDash = () => render(<MemoryRouter><RoleWorker /></MemoryRouter>);

/**
 * The StatCard whose label matches. Uses the first match because the stats grid
 * renders before the progress bars (which reuse labels like "In Progress"), and
 * scopes to that card so duplicate values (two "1"s) don't clash.
 */
const statCard = (label: string) => screen.getAllByText(label)[0].closest("div.card-panel") as HTMLElement;

describe("RoleWorker dashboard", () => {
  it("loads assigned tasks and renders them", async () => {
    renderDash();
    // Alpha and Beta each appear once (Recent Tasks); Gamma appears in both the
    // Overdue and Recent sections, so it's intentionally not asserted here.
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/tasks");
  });

  it("computes the overview stats correctly", async () => {
    renderDash();
    await screen.findByText("Alpha");

    expect(within(statCard("Total Tasks")).getByText("5")).toBeInTheDocument();
    expect(within(statCard("In Progress")).getByText("2")).toBeInTheDocument();
    expect(within(statCard("Overdue")).getByText("1")).toBeInTheDocument();
    expect(within(statCard("Due This Week")).getByText("1")).toBeInTheDocument();
  });

  it("greets the worker", async () => {
    renderDash();
    await screen.findByText("Alpha");
    expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no tasks", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderDash();
    // Recent Tasks section renders its empty message once loaded.
    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
  });
});
