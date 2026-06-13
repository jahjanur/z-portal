// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AdminStatusControls from "../components/taskdetail/AdminStatusControls";

afterEach(cleanup);

describe("AdminStatusControls", () => {
  it("always offers the three status transitions and routes the chosen value", () => {
    const onStatusChange = vi.fn();
    render(
      <AdminStatusControls currentStatus="PENDING" onStatusChange={onStatusChange} onApproveCompletion={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /mark as pending/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as in progress/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as completed/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark as in progress/i }));
    expect(onStatusChange).toHaveBeenCalledWith("IN_PROGRESS");
  });

  it("only shows Approve Completion when the task is pending approval", () => {
    const onApprove = vi.fn();
    const { rerender } = render(
      <AdminStatusControls currentStatus="IN_PROGRESS" onStatusChange={vi.fn()} onApproveCompletion={onApprove} />
    );
    expect(screen.queryByRole("button", { name: /approve completion/i })).not.toBeInTheDocument();

    rerender(
      <AdminStatusControls currentStatus="PENDING_APPROVAL" onStatusChange={vi.fn()} onApproveCompletion={onApprove} />
    );
    const approve = screen.getByRole("button", { name: /approve completion/i });
    expect(approve).toBeInTheDocument();
    fireEvent.click(approve);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});
