import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  profileStatus: string | null;
}

interface TaskSummary {
  id: number;
  title: string;
  status: string;
  clientId: number;
  createdAt: string;
}

interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  clientId: number;
  createdAt: string;
}

interface InvoiceSummary {
  id: number;
  amount: number;
  status: string;
  clientId: number;
  createdAt: string;
  invoiceNumber: string;
  paidAt: string | null;
}

interface Stats {
  totalClients: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalProjects: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
}

interface AnalyticsData {
  clients: Client[];
  tasks: TaskSummary[];
  projects: ProjectSummary[];
  invoices: InvoiceSummary[];
  stats: Stats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(amount);
}

export default function EraSphereAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await API.get("/users/erasphere/analytics");
        if (!cancelled) setData(res.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] w-full max-w-full min-w-0 px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Dashboard</h2>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-80" />
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.1s" }} />
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-40" style={{ animationDelay: "0.2s" }} />
            </div>
            <span className="text-[var(--color-text-muted)]">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] w-full max-w-full min-w-0 px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Dashboard</h2>
        <div className="rounded-2xl card-panel p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  const { stats, clients, tasks, invoices } = data;

  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] w-full max-w-full min-w-0 px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Dashboard</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Overview of your referred clients, projects, and earnings</p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <p className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total Clients</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{stats.totalClients}</p>
        </div>
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <p className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Active Tasks</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{stats.activeTasks}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{stats.completedTasks} completed</p>
        </div>
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <p className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Paid</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(stats.paidRevenue)}</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">{formatCurrency(stats.pendingRevenue)} pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Clients */}
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">My Clients</h3>
            <button
              onClick={() => navigate("/admin/clients")}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {clients.length === 0 ? (
            <p className="py-6 text-center text-[var(--color-text-muted)]">No clients yet. Add your first client!</p>
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg card-panel p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.company || c.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.profileStatus === "COMPLETE"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {c.profileStatus === "COMPLETE" ? "Complete" : "Incomplete"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Recent Tasks</h3>
            <button
              onClick={() => navigate("/admin/tasks")}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <p className="py-6 text-center text-[var(--color-text-muted)]">No tasks yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((t) => {
                const statusColors: Record<string, string> = {
                  PENDING: "bg-amber-500/10 text-amber-600",
                  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
                  PENDING_APPROVAL: "bg-purple-500/10 text-purple-600",
                  COMPLETED: "bg-green-500/10 text-green-600",
                };
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg card-panel p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-text-primary)] truncate">{t.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[t.status] || "bg-gray-500/10 text-gray-600"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices (read-only view of their clients' invoices) */}
        <div className="rounded-2xl card-panel p-5 shadow-lg lg:col-span-2 min-w-0 max-w-full">
          <h3 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">Revenue Breakdown</h3>
          {recentInvoices.length === 0 ? (
            <p className="py-6 text-center text-[var(--color-text-muted)]">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Invoice</th>
                    <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Amount</th>
                    <th className="pb-3 pr-4 font-semibold text-[var(--color-text-primary)]">Status</th>
                    <th className="pb-3 font-semibold text-[var(--color-text-primary)]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-4 text-[var(--color-text-primary)]">{inv.invoiceNumber}</td>
                      <td className="py-3 pr-4 font-medium text-[var(--color-text-primary)]">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "PAID" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--color-text-muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
