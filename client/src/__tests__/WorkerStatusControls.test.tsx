// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import WorkerStatusControls from "../components/taskdetail/WorkerStatusControls";

afterEach(cleanup);

describe("WorkerStatusControls", () => {
  it("shows the Request Completion action while work is ongoing and fires the callback", () => {
    const onRequestCompletion = vi.fn();
    render(<WorkerStatusControls currentStatus="IN_PROGRESS" onRequestCompletion={onRequestCompletion} />);

    const btn = screen.getByRole("button", { name: /request completion/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRequestCompletion).toHaveBeenCalledTimes(1);
  });

  it("hides the action and shows a waiting state when pending approval", () => {
    render(<WorkerStatusControls currentStatus="PENDING_APPROVAL" onRequestCompletion={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /request completion/i })).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for admin approval/i)).toBeInTheDocument();
  });

  it("shows a completed state once the task is completed", () => {
    render(<WorkerStatusControls currentStatus="COMPLETED" onRequestCompletion={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /request completion/i })).not.toBeInTheDocument();
    expect(screen.getByText(/task completed/i)).toBeInTheDocument();
  });
});
