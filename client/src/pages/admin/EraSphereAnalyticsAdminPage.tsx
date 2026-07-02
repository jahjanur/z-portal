import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import {
  CircleDollarSign,
  Users,
  Handshake,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  FileText,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonDashboard } from "../../components/ui/Skeleton";
import { isAmountsHidden, maskedAmount } from "../../utils/currency";

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
  currency?: string;
}

interface InvoiceItem {
  id: number;
  amount: number;
  currency?: string;
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

function formatCurrency(amount: number, currency = "USD"): string {
  if (isAmountsHidden()) return maskedAmount(currency);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${currency}`;
  }
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
            className={`h-full ${colorMap[item.label] || "bg-[var(--color-text-muted)]"}`}
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
    Pending: "bg-[var(--color-warning-text)]",
    "In Progress": "bg-[var(--color-info-text)]",
    Approval: "bg-[var(--color-text-secondary)]",
    Completed: "bg-[var(--color-success-text)]",
  };

  const profileComplete = clients.filter((c) => c.profileStatus === "COMPLETE").length;
  const profileIncomplete = clients.length - profileComplete;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] w-full min-w-0">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error || !data || !stats) {
    return (
      <div className="mx-auto max-w-[1400px] w-full min-w-0 space-y-6">
        <PageHeader title="EraSphere Analytics" subtitle="Full overview of partners, referred clients, tasks, projects, and revenue" />
        <div className="card-panel p-5 sm:p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] w-full min-w-0 space-y-6">
      <PageHeader
        title="EraSphere Analytics"
        subtitle="All-time overview of partners, referred clients, tasks, projects, and revenue"
      />

      {/* Top stats — 6 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
        <StatCard
          label="Partners"
          value={stats.totalPartners}
          tone="neutral"
          icon={<Handshake className="h-5 w-5" />}
          onClick={() => navigate("/admin/erasphere/partners")}
        />
        <StatCard
          label="Clients"
          value={stats.totalClients}
          tone="info"
          icon={<Users className="h-5 w-5" />}
          hint={`${profileComplete} complete · ${profileIncomplete} pending`}
          onClick={() => navigate("/admin/erasphere/clients")}
        />
        <StatCard
          label="Total Tasks"
          value={stats.totalTasks}
          tone="neutral"
          icon={<ClipboardList className="h-5 w-5" />}
          hint={`${stats.activeTasks} active · ${stats.completedTasks} done`}
          onClick={() => navigate("/admin/erasphere/tasks")}
        />
        <StatCard
          label="Completion"
          value={`${taskCompletionRate}%`}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
          hint="task completion rate"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, stats.currency)}
          tone="success"
          icon={<CircleDollarSign className="h-5 w-5" />}
          hint={
            <span className="font-medium text-[var(--color-success-text)]">{collectionRate}% collected</span>
          }
        />
        <StatCard
          label="Avg / Client"
          value={formatCurrency(avgRevenuePerClient, stats.currency)}
          tone="neutral"
          icon={<TrendingUp className="h-5 w-5" />}
          hint="revenue per client"
        />
      </div>

      {/* Task status distribution bar */}
      <div className="card-panel p-5 sm:p-6">
        <h3 className="section-title mb-3">Task Status Distribution</h3>
        {statusBarItems.some((i) => i.count > 0) ? (
          <>
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
          </>
        ) : (
          <EmptyState
            compact
            icon={<ClipboardList className="h-6 w-6" />}
            title="No task data"
            description="Task status distribution appears once tasks exist."
          />
        )}
      </div>

      {/* Revenue breakdown + partner summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-panel p-5 sm:p-6">
          <h3 className="section-title mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Total Revenue</span>
              <span className="text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(stats.totalRevenue, stats.currency)}</span>
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-success-text)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Paid</span>
              </div>
              <span className="text-sm font-semibold text-[var(--color-success-text)]">{formatCurrency(stats.paidRevenue, stats.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-warning-text)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Pending</span>
              </div>
              <span className="text-sm font-semibold text-[var(--color-warning-text)]">{formatCurrency(stats.pendingRevenue, stats.currency)}</span>
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

        <div className="card-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="section-title">Partner Performance</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/partners")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {(partners ?? []).length === 0 && stats.totalPartners === 0 ? (
            <EmptyState
              compact
              icon={<Handshake className="h-6 w-6" />}
              title="No partners yet"
              description="Partner performance appears once partners join."
            />
          ) : (
            <div className="space-y-3">
              {(partners ?? []).slice(0, 5).map((p) => {
                const count = clientsPerPartner[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="row-hover flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{p.company || p.email}</p>
                    </div>
                    <StatusBadge tone="neutral" dot={false} className="shrink-0 self-start sm:self-center">
                      {count} {count === 1 ? "client" : "clients"}
                    </StatusBadge>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="section-title">Recent Clients</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/clients")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all ({clients.length})
            </button>
          </div>
          {recentClients.length === 0 ? (
            <EmptyState
              compact
              icon={<UserRound className="h-6 w-6" />}
              title="No referred clients yet"
              description="Clients referred by partners will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {recentClients.map((c) => (
                <div
                  key={c.id}
                  className="row-hover flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.company || c.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                    <span className="text-xs text-[var(--color-text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <StatusBadge status={c.profileStatus === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}>
                      {c.profileStatus === "COMPLETE" ? "Complete" : "Pending"}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="section-title">Recent Tasks</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/erasphere/tasks")}
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all ({tasks.length})
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState
              compact
              icon={<ClipboardList className="h-6 w-6" />}
              title="No tasks yet"
              description="Tasks for referred clients will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="row-hover flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{t.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={t.status} className="shrink-0 self-start sm:self-center" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoices table — full width */}
      <div className="card-panel p-5 sm:p-6 min-w-0 max-w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="section-title">Recent Invoices</h3>
          <span className="text-xs text-[var(--color-text-muted)]">{invoices.length} total</span>
        </div>
        {recentInvoices.length === 0 ? (
          <EmptyState
            compact
            icon={<FileText className="h-6 w-6" />}
            title="No invoices yet"
            description="Invoices issued to referred clients will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  return (
                    <tr key={inv.id}>
                      <td className="font-medium text-[var(--color-text-primary)]">{inv.invoiceNumber}</td>
                      <td className="text-[var(--color-text-secondary)]">{client?.name || `#${inv.clientId}`}</td>
                      <td className="text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(inv.amount, inv.currency)}</td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-[var(--color-text-muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="text-[var(--color-text-muted)]">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}</td>
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
