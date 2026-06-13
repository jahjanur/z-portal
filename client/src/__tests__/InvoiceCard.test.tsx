// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import InvoiceCard from "../components/user/InvoiceCard";
import { formatCurrency, formatDate, getDaysUntilDue, getStatusColor } from "../utils";

afterEach(cleanup);

const DAY = 1000 * 60 * 60 * 24;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

const renderCard = (invoice: { invoiceNumber: string; amount: number; status: string; dueDate: string }) =>
  render(
    <InvoiceCard
      invoice={{ id: 1, ...invoice }}
      getStatusColor={getStatusColor}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
      getDaysUntilDue={getDaysUntilDue}
      primaryColor=""
    />
  );

describe("InvoiceCard status badge", () => {
  it("labels a past-due PENDING invoice as Overdue (not a red 'Pending')", () => {
    renderCard({ invoiceNumber: "INV-0001", amount: 500, status: "PENDING", dueDate: inDays(-3) });
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("labels a not-yet-due PENDING invoice as Pending", () => {
    renderCard({ invoiceNumber: "INV-0002", amount: 200, status: "PENDING", dueDate: inDays(10) });
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("labels a paid invoice as Paid even if its due date passed", () => {
    renderCard({ invoiceNumber: "INV-0003", amount: 50, status: "PAID", dueDate: inDays(-5) });
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });
});
