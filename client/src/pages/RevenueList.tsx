import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

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

const colors = {
  primary: "rgba(255,255,255,0.9)",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function RevenueList() {
  const navigate = useNavigate();
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

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidRevenue = filteredInvoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = filteredInvoices.filter(i => i.status === "PENDING").reduce((sum, i) => sum + i.amount, 0);

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
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce bg-white/80"></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.success, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.warning, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-400">Loading revenue data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-app md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 transition-colors border border-border-subtle bg-card rounded-lg hover:bg-app"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
              Revenue <span className="text-[var(--color-text-secondary)]">Overview</span>
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">Complete breakdown of all invoices and revenue</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
          <div className="p-6 border border-border-subtle bg-card shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">Total Revenue</p>
              <div className="rounded-lg bg-[var(--color-surface-3)] p-2">
                <svg className="h-5 w-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--color-text-primary)]">{formatCurrency(totalRevenue)}</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{filteredInvoices.length} invoices</p>
          </div>

          <div className="p-6 border border-border-subtle bg-card shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400">Paid</p>
              <div className="p-2 rounded-lg bg-green-50">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(paidRevenue)}</p>
            <p className="mt-2 text-sm text-gray-500">
              {filteredInvoices.filter(i => i.status === "PAID").length} invoices
            </p>
          </div>

          <div className="p-6 border border-border-subtle bg-card shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400">Pending</p>
              <div className="p-2 rounded-lg bg-amber-50">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(pendingRevenue)}</p>
            <p className="mt-2 text-sm text-gray-500">
              {filteredInvoices.filter(i => i.status === "PENDING").length} invoices
            </p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col gap-4 p-6 mb-6 border border-border-subtle bg-card shadow-sm md:flex-row md:items-center md:justify-between rounded-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "all" ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border border-[var(--color-tab-active-border)]" : "text-[var(--color-tab-inactive-text)] border border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setFilter("paid")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "paid" ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border border-[var(--color-tab-active-border)]" : "text-[var(--color-tab-inactive-text)] border border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
              }`}
            >
              Paid ({invoices.filter(i => i.status === "PAID").length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "pending" ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border border-[var(--color-tab-active-border)]" : "text-[var(--color-tab-inactive-text)] border border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
              }`}
            >
              Pending ({invoices.filter(i => i.status === "PENDING").length})
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "amount" | "client")}
              className="input-dark rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-semibold"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="client">Sort by Client</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 border border-border-subtle bg-card rounded-lg hover:bg-app"
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Revenue by Client Table */}
        <div className="p-6 mb-8 border border-border-subtle bg-card shadow-sm rounded-2xl">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">Revenue by Client</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-[var(--color-text-muted)]">Client</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-[var(--color-text-muted)]">Invoices</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-[var(--color-text-muted)]">Total</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-[var(--color-text-muted)]">Paid</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-[var(--color-text-muted)]">Pending</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(revenueByClient)
                  .sort((a, b) => b.total - a.total)
                  .map((client, index) => (
                    <tr key={index} className="transition-colors border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-[var(--color-text-muted)]">{client.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-[var(--color-text-primary)]">
                        {formatCurrency(client.total)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                        {formatCurrency(client.paid)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-amber-600">
                        {formatCurrency(client.pending)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Invoice List */}
        <div className="p-6 border border-border-subtle bg-card shadow-sm rounded-2xl">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">All Invoices</h2>
          <div className="space-y-3">
            {sortedInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex cursor-pointer flex-col gap-4 rounded-xl card-panel p-4 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover md:flex-row md:items-center md:justify-between"
                onClick={() => navigate("/admin/invoices")}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-[var(--color-surface-3)] p-3">
                    <svg
                      className="h-6 w-6 text-[var(--color-text-secondary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Invoice #{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{invoice.client?.name || "Unknown Client"}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{invoice.client?.email}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <div className="text-2xl font-bold" style={{ color: invoice.status === "PAID" ? colors.success : colors.warning }}>
                    {formatCurrency(invoice.amount)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {invoice.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {invoice.status === "PAID" && invoice.paidAt
                        ? `Paid ${formatDate(invoice.paidAt)}`
                        : `Due ${formatDate(invoice.dueDate)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {sortedInvoices.length === 0 && (
              <div className="py-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-400">No invoices found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}