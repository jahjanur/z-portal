import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { CircleDollarSign, Users, ClipboardList, CheckCircle2, FileText, UserRound } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonDashboard } from "../../components/ui/Skeleton";

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
  currency?: string;
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
  currency?: string;
}

interface AnalyticsData {
  clients: Client[];
  tasks: TaskSummary[];
  projects: ProjectSummary[];
  invoices: InvoiceSummary[];
  stats: Stats;
}

function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${currency}`;
  }
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
        <SkeletonDashboard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] w-full max-w-full min-w-0 px-4 py-8 space-y-6">
        <PageHeader title="EraSphere Dashboard" subtitle="Overview of your referred clients, projects, and earnings" />
        <div className="card-panel p-5 sm:p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <p className="text-[var(--color-destructive-text)]">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  const { stats, clients, tasks, invoices } = data;

  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] w-full max-w-full min-w-0 px-4 py-8 space-y-6">
      <PageHeader
        title="EraSphere Dashboard"
        subtitle="All-time overview of your referred clients, projects, and earnings"
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        <StatCard
          label="Total Clients"
          value={stats.totalClients}
          tone="info"
          icon={<Users className="h-5 w-5" />}
          onClick={() => navigate("/admin/clients")}
        />
        <StatCard
          label="Active Tasks"
          value={stats.activeTasks}
          tone="neutral"
          icon={<ClipboardList className="h-5 w-5" />}
          hint={`${stats.completedTasks} completed`}
          onClick={() => navigate("/admin/tasks")}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue, stats.currency)}
          tone="success"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Paid"
          value={formatCurrency(stats.paidRevenue, stats.currency)}
          tone={stats.pendingRevenue > 0 ? "warning" : "success"}
          icon={<CheckCircle2 className="h-5 w-5" />}
          hint={
            <span className="font-medium text-[var(--color-warning-text)]">
              {formatCurrency(stats.pendingRevenue, stats.currency)} pending
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* My Clients */}
        <div className="card-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="section-title">My Clients</h3>
            <button
              onClick={() => navigate("/admin/clients")}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {clients.length === 0 ? (
            <EmptyState
              compact
              icon={<UserRound className="h-6 w-6" />}
              title="No clients yet"
              description="Add your first client to get started."
            />
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="row-hover flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.company || c.email}</p>
                  </div>
                  <StatusBadge
                    status={c.profileStatus === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}
                    className="shrink-0 self-start sm:self-center"
                  >
                    {c.profileStatus === "COMPLETE" ? "Complete" : "Incomplete"}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="card-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="section-title">Recent Tasks</h3>
            <button
              onClick={() => navigate("/admin/tasks")}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              View all
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState
              compact
              icon={<ClipboardList className="h-6 w-6" />}
              title="No tasks yet"
              description="Tasks for your clients will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="row-hover flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{t.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={t.status} className="shrink-0 self-start sm:self-center" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices (read-only view of their clients' invoices) */}
        <div className="card-panel p-5 sm:p-6 lg:col-span-2 min-w-0 max-w-full">
          <h3 className="section-title mb-4">Revenue Breakdown</h3>
          {recentInvoices.length === 0 ? (
            <EmptyState
              compact
              icon={<FileText className="h-6 w-6" />}
              title="No invoices yet"
              description="Invoices issued to your clients will appear here."
            />
          ) : (
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="text-[var(--color-text-primary)]">{inv.invoiceNumber}</td>
                      <td className="font-medium text-[var(--color-text-primary)]">{formatCurrency(inv.amount, inv.currency)}</td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-[var(--color-text-muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
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
