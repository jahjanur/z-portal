// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Pagination from "../components/ui/Pagination";

afterEach(cleanup);

describe("Pagination", () => {
  it("renders nothing when there is a single page or none", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every page for a small range and disables Previous on page 1", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).not.toBeDisabled();
  });

  it("marks the current page with aria-current", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2" })).not.toHaveAttribute("aria-current");
  });

  it("fires onPageChange for a page number and for Next/Previous", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(3); // currentPage + 1

    fireEvent.click(screen.getByLabelText("Previous page"));
    expect(onPageChange).toHaveBeenCalledWith(1); // currentPage - 1
  });

  it("disables Next on the last page", () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).not.toBeDisabled();
  });

  it("windows the pages with ellipses for a large range", () => {
    render(<Pagination currentPage={10} totalPages={20} onPageChange={vi.fn()} />);
    // First, last, and the window around the current page are shown.
    for (const n of ["1", "9", "10", "11", "20"]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
    // Far-away pages are collapsed behind ellipses.
    expect(screen.queryByRole("button", { name: "5" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "15" })).not.toBeInTheDocument();
    expect(screen.getAllByText("…").length).toBe(2);
  });

  it("shows a single leading ellipsis when near the start", () => {
    render(<Pagination currentPage={2} totalPages={20} onPageChange={vi.fn()} />);
    // currentPage=2 → no leading ellipsis (currentPage not > 3), one trailing ellipsis.
    expect(screen.getAllByText("…").length).toBe(1);
    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
  });
});
