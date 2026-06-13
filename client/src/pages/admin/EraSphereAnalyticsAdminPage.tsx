import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

interface Partner {
  id: number;
  name: string;
  email: string;
  company: string | null;
}

interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  profileStatus: string | null;
  referredById: number | null;
}

interface TaskSummary {
  id: number;
  title: string;
  status: string;
  clientId: number;
  createdAt: string;
}

interface Stats {
  totalPartners: number;
  totalClients: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalProjects: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
}

interface InvoiceItem {
  id: number;
  amount: number;
  status: string;
  clientId: number;
  createdAt: string;
  invoiceNumber: string;
  paidAt: string | null;
}

interface AnalyticsData {
  clients: Client[];
  tasks: TaskSummary[];
  partners?: Partner[];
  projects: { id: number; name: string; status: string; clientId: number; createdAt: string }[];
  invoices: InvoiceItem[];
  stats: Stats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(amount);
}

function StatusBar({ items, colorMap }: { items: { label: string; count: number }[]; colorMap: Record<string, string> }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
      {items.map((item) => {
        const pct = (item.count / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={item.label}
            className={`h-full ${colorMap[item.label] || "bg-gray-400"}`}
            style={{ width: `${pct}%` }}
            title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}

export default function EraSphereAnalyticsAdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await API.get("/users/erasphere/admin-analytics");
        if (!cancelled) setData(res.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load EraSphere analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = data?.stats;
  const clients = data?.clients ?? [];
  const tasks = data?.tasks ?? [];
  const invoices = data?.invoices ?? [];
  const partners = data?.partners;

  const taskStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { PENDING: 0, IN_PROGRESS: 0, PENDING_APPROVAL: 0, COMPLETED: 0 };
    tasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  }, [tasks]);

  const taskCompletionRate = stats ? (stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0) : 0;
  const avgRevenuePerClient = stats ? (stats.totalClients > 0 ? stats.totalRevenue / stats.totalClients : 0) : 0;
  const collectionRate = stats ? (stats.totalRevenue > 0 ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100) : 0) : 0;

  const recentClients = useMemo(
    () => [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [clients]
  );
  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [tasks]
  );
  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [invoices]
  );

  const clientsPerPartner = useMemo(() => {
    const map: Record<number, number> = {};
    clients.forEach((c) => {
      if (c.referredById != null) map[c.referredById] = (map[c.referredById] || 0) + 1;
    });
    return map;
  }, [clients]);

  const statusBarItems = useMemo(
    () => [
      { label: "Pending", count: taskStatusCounts.PENDING || 0 },
      { label: "In Progress", count: taskStatusCounts.IN_PROGRESS || 0 },
      { label: "Approval", count: taskStatusCounts.PENDING_APPROVAL || 0 },
      { label: "Completed", count: taskStatusCounts.COMPLETED || 0 },
    ],
    [taskStatusCounts]
  );
  const statusBarColors: Record<string, string> = {
    Pending: "bg-amber-500",
    "In Progress": "bg-blue-500",
    Approval: "bg-purple-500",
    Completed: "bg-green-500",
  };

  const profileComplete = clients.filter((c) => c.profileStatus === "COMPLETE").length;
  const profileIncomplete = clients.length - profileComplete;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Analytics</h2>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-80" />
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.1s" }} />
              <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-40" style={{ animationDelay: "0.2s" }} />
            </div>
            <span className="text-[var(--color-text-muted)]">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !stats) {
    return (
      <div className="mx-auto max-w-[1400px] w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Analytics</h2>
        <div className="rounded-2xl card-panel p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] w-full min-w-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Analytics</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Full overview of partners, referred clients, tasks, projects, and revenue</p>
      </div>

      {/* Top stats — 6 cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Partners</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{stats.totalPartners}</p>
        </div>
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Clients</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{stats.totalClients}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{profileComplete} complete / {profileIncomplete} pending</p>
        </div>
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total Tasks</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{stats.totalTasks}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{stats.activeTasks} active / {stats.completedTasks} done</p>
        </div>
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Completion</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{taskCompletionRate}%</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">task completion rate</p>
        </div>
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total Revenue</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalRevenue)}</p>
          <p className="mt-0.5 text-[10px] text-green-600 font-medium">{collectionRate}% collected</p>
        </div>
        <div className="rounded-2xl card-panel p-4 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Avg / Client</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(avgRevenuePerClient)}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">revenue per client</p>
        </div>
      </div>

      {/* Task status distribution bar */}
      <div className="mb-8 rounded-2xl card-panel p-5 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Task Status Distribution</h3>
        <StatusBar items={statusBarItems} colorMap={statusBarColors} />
        <div className="mt-3 flex flex-wrap gap-4">
          {statusBarItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusBarColors[item.label]}`} />
              <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue breakdown + partner summary */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Total Revenue</span>
              <span className="text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-[var(--color-text-secondary)]">Paid</span>
              </div>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(stats.paidRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-[var(--color-text-secondary)]">Pending</span>
              </div>
              <span className="text-sm font-semibold text-amber-600">{formatCurrency(stats.pendingRevenue)}</span>
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Projects</span>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">{stats.totalProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Invoices Issued</span>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">{invoices.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Partner Performance</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/partners")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {(partners ?? []).length === 0 && stats.totalPartners === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">No partners yet.</p>
          ) : (
            <div className="space-y-3">
              {(partners ?? []).slice(0, 5).map((p) => {
                const count = clientsPerPartner[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg card-panel p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{p.company || p.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-surface-3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                      {count} {count === 1 ? "client" : "clients"}
                    </span>
                  </div>
                );
              })}
              {stats.totalPartners > 0 && (partners ?? []).length === 0 && (
                <p className="text-center text-xs text-[var(--color-text-muted)]">{stats.totalPartners} partner{stats.totalPartners !== 1 ? "s" : ""} registered</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clients + Recent Tasks */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Clients</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/clients")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all ({clients.length})
            </button>
          </div>
          {recentClients.length === 0 ? (
            <p className="py-6 text-center text-[var(--color-text-muted)]">No referred clients yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg card-panel p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.company || c.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      c.profileStatus === "COMPLETE" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {c.profileStatus === "COMPLETE" ? "Complete" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl card-panel p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Tasks</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/tasks")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all ({tasks.length})
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <p className="py-6 text-center text-[var(--color-text-muted)]">No tasks yet.</p>
          ) : (
            <div className="space-y-2.5">
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
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{t.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[t.status] || "bg-gray-500/10 text-gray-600"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invoices table — full width */}
      <div className="rounded-2xl card-panel p-5 shadow-lg min-w-0 max-w-full">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent Invoices</h3>
          <span className="text-xs text-[var(--color-text-muted)]">{invoices.length} total</span>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="py-6 text-center text-[var(--color-text-muted)]">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-3 pr-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Invoice</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Client</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-right">Amount</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Issued</th>
                  <th className="pb-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Paid</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  return (
                    <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-4 text-sm text-[var(--color-text-primary)] font-medium">{inv.invoiceNumber}</td>
                      <td className="py-3 pr-4 text-sm text-[var(--color-text-secondary)]">{client?.name || `#${inv.clientId}`}</td>
                      <td className="py-3 pr-4 text-sm font-semibold text-[var(--color-text-primary)] text-right">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === "PAID" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-xs text-[var(--color-text-muted)]">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
