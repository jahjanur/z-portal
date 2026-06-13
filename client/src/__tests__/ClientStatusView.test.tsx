// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ClientStatusView from "../components/taskdetail/ClientStatusView";

afterEach(cleanup);

describe("ClientStatusView", () => {
  it("maps each status to its progress percentage and label", () => {
    const cases: Array<[string, string, string]> = [
      ["PENDING", "20%", "Waiting to start"],
      ["IN_PROGRESS", "60%", "Work in progress"],
      ["PENDING_APPROVAL", "90%", "Under review"],
      ["COMPLETED", "100%", "Project completed"],
    ];
    for (const [status, pct, label] of cases) {
      render(<ClientStatusView currentStatus={status} />);
      expect(screen.getByText(pct)).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
      cleanup();
    }
  });

  it("falls back to 0% / unknown for an unrecognized status", () => {
    render(<ClientStatusView currentStatus="WHATEVER" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText(/status unknown/i)).toBeInTheDocument();
  });

  it("is case-insensitive about the status value", () => {
    render(<ClientStatusView currentStatus="in_progress" />);
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
