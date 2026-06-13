import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import { computeInvoiceRevenue } from "../utils";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: "PAID" | "PENDING";
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  client?: { name: string; email: string; id: number };
}

const PILL_ACTIVE =
  "rounded-full bg-[var(--color-nav-active-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-nav-active-text)] shadow-elev-sm transition-colors";
const PILL_INACTIVE =
  "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]";

export default function RevenueList() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "client">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await API.get<Invoice[]>("/invoices");
      setInvoices(response.data);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "all") return true;
    return inv.status.toUpperCase() === filter.toUpperCase();
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "date") {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "amount") {
      comparison = b.amount - a.amount;
    } else if (sortBy === "client") {
      comparison = (a.client?.name || "").localeCompare(b.client?.name || "");
    }

    return sortOrder === "asc" ? -comparison : comparison;
  });

  // Outstanding (pending) = anything not paid, so Paid + Pending = Total Revenue
  // and it agrees with the per-client breakdown below (which buckets non-PAID as
  // pending). Using status === "PENDING" would drop OVERDUE-status invoices.
  const { totalRevenue, totalPaid: paidRevenue, totalPending: pendingRevenue } =
    computeInvoiceRevenue(filteredInvoices);

  const revenueByClient = filteredInvoices.reduce((acc, inv) => {
    const clientId = inv.client?.id || 0;
    const clientName = inv.client?.name || "Unknown";

    if (!acc[clientId]) {
      acc[clientId] = {
        name: clientName,
        total: 0,
        paid: 0,
        pending: 0,
        count: 0,
      };
    }

    acc[clientId].total += inv.amount;
    acc[clientId].count += 1;

    if (inv.status === "PAID") {
      acc[clientId].paid += inv.amount;
    } else {
      acc[clientId].pending += inv.amount;
    }

    return acc;
  }, {} as Record<number, { name: string; total: number; paid: number; pending: number; count: number }>);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Revenue Overview"
          subtitle="Complete breakdown of all invoices and revenue"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(totalRevenue)}
            hint={`${filteredInvoices.length} invoices`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Paid"
            value={formatCurrency(paidRevenue)}
            tone="success"
            hint={`${filteredInvoices.filter(i => i.status === "PAID").length} invoices`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Pending"
            value={formatCurrency(pendingRevenue)}
            tone="warning"
            hint={`${filteredInvoices.filter(i => i.status !== "PAID").length} invoices`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Filters and sort */}
        <div className="card-panel flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter("all")} className={filter === "all" ? PILL_ACTIVE : PILL_INACTIVE}>
              All ({invoices.length})
            </button>
            <button onClick={() => setFilter("paid")} className={filter === "paid" ? PILL_ACTIVE : PILL_INACTIVE}>
              Paid ({invoices.filter(i => i.status === "PAID").length})
            </button>
            <button onClick={() => setFilter("pending")} className={filter === "pending" ? PILL_ACTIVE : PILL_INACTIVE}>
              Pending ({invoices.filter(i => i.status === "PENDING").length})
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "client")}
              className="input-dark rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-semibold"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="client">Sort by Client</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 transition-colors hover:bg-[var(--color-surface-3)]"
              aria-label="Toggle sort order"
            >
              <svg
                className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Revenue by client table */}
        <section className="space-y-3">
          <h2 className="section-title">Revenue by Client</h2>
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="!text-right">Invoices</th>
                  <th className="!text-right">Total</th>
                  <th className="!text-right">Paid</th>
                  <th className="!text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(revenueByClient)
                  .sort((a, b) => b.total - a.total)
                  .map((client, index) => (
                    <tr key={index}>
                      <td className="font-medium text-[var(--color-text-primary)]">{client.name}</td>
                      <td className="text-right">{client.count}</td>
                      <td className="text-right font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(client.total)}
                      </td>
                      <td className="text-right font-semibold text-[var(--color-success-text)]">
                        {formatCurrency(client.paid)}
                      </td>
                      <td className="text-right font-semibold text-[var(--color-warning-text)]">
                        {formatCurrency(client.pending)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed invoice list */}
        <section className="space-y-3">
          <h2 className="section-title">All Invoices</h2>
          {sortedInvoices.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No invoices found"
              description="Try adjusting your filters"
            />
          ) : (
            <div className="space-y-3 stagger-children">
              {sortedInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="card-panel card-panel-hover flex cursor-pointer flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
                  onClick={() => navigate(isAdmin ? "/admin/zulbera/invoices" : "/admin/invoices")}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                      <svg className="h-6 w-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-[var(--color-text-primary)]">
                        Invoice #{invoice.invoiceNumber}
                      </h3>
                      <p className="truncate text-sm text-[var(--color-text-muted)]">{invoice.client?.name || "Unknown Client"}</p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{invoice.client?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div
                      className={`text-xl font-bold sm:text-2xl ${
                        invoice.status === "PAID"
                          ? "text-[var(--color-success-text)]"
                          : "text-[var(--color-warning-text)]"
                      }`}
                    >
                      {formatCurrency(invoice.amount)}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={invoice.status} />
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {invoice.status === "PAID" && invoice.paidAt
                          ? `Paid ${formatDate(invoice.paidAt)}`
                          : `Due ${formatDate(invoice.dueDate)}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
