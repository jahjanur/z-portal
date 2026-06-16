import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { formatCurrency, formatDate, computeInvoiceRevenue, isInvoiceOverdue } from "../../utils";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  CircleDollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ClipboardList,
  FileText,
  ChevronRight,
  Layers,
  Megaphone,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonDashboard } from "../../components/ui/Skeleton";
import { SERVICE_TYPES } from "../../utils/serviceTypes";

interface SvcProject {
  id: number;
  name: string;
  serviceType?: string;
  metadata?: Record<string, unknown> | null;
  client?: { id: number; name: string };
}
const mnum = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

interface User {
  id: number;
  role: "ADMIN" | "WORKER" | "CLIENT";
  name: string;
  email: string;
  createdAt: string;
  profileStatus?: string;
  referredById?: number | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: "PAID" | "PENDING";
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  client?: { name: string; id: number };
}

interface Task {
  id: number;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "PENDING_APPROVAL";
  createdAt: string;
  dueDate?: string;
  client?: { name: string; id: number; referredById?: number | null };
  workers?: { user: { name: string; id: number } }[];
}

interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingExpiry?: string;
  sslExpiry?: string;
  client: { id: number; name: string; company?: string };
}

const colors = {
  primary: "rgba(255,255,255,0.9)",
  accent: "#FFA726",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

const axisTick = { fill: "var(--color-text-muted)", fontSize: 12 };
const tooltipContentStyle = {
  background: "var(--color-panel-solid)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
};
const tooltipLabelStyle = { color: "var(--color-text-primary)" };
const legendWrapperStyle = { color: "var(--color-text-muted)", fontSize: 12 };

export default function ZulberaAnalyticsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [projects, setProjects] = useState<SvcProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, invoicesRes, tasksRes, projectsRes] = await Promise.all([
        API.get<User[]>("/users"),
        API.get<Invoice[]>("/invoices"),
        API.get<Task[]>("/tasks"),
        API.get<SvcProject[]>("/projects").catch(() => ({ data: [] as SvcProject[] })),
      ]);
      setUsers(usersRes.data);
      setInvoices(invoicesRes.data);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);

      const adminOwnClients = usersRes.data.filter(
        (u) => u.role === "CLIENT" && (u as User).referredById == null
      );
      const allDomains: Domain[] = [];
      for (const client of adminOwnClients) {
        try {
          const domainRes = await API.get(`/domains/client/${client.id}`);
          allDomains.push(...domainRes.data);
        } catch (err) {
          console.error(`Error fetching domains for client ${client.id}:`, err);
        }
      }
      setDomains(allDomains);
    } catch (err) {
      console.error("Error fetching Zulbera overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const adminOwnClientIds = users
    .filter((u) => u.role === "CLIENT" && u.referredById == null)
    .map((u) => u.id);
  const adminOwnInvoices = invoices.filter(
    (i) => i.client && adminOwnClientIds.includes(i.client.id)
  );
  const adminOwnTasks = tasks.filter(
    (t) => t.client && (t.client as { referredById?: number | null }).referredById == null
  );

  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    return {
      invoices: adminOwnInvoices.filter((i) => new Date(i.createdAt) >= startDate),
      tasks: adminOwnTasks.filter((t) => new Date(t.createdAt) >= startDate),
    };
  };

  const { invoices: filteredInvoices, tasks: filteredTasks } = getFilteredData();

  const totalClients = adminOwnClientIds.length;
  const incompleteProfiles = users.filter(
    (u) => u.role === "CLIENT" && u.referredById == null && u.profileStatus === "INCOMPLETE"
  ).length;

  const { totalPaid, totalPending, totalRevenue } = computeInvoiceRevenue(filteredInvoices);

  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED").length;
  const activeTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingTasks = filteredTasks.filter((t) => t.status === "PENDING").length;
  const pendingApproval = adminOwnTasks.filter((t) => t.status === "PENDING_APPROVAL").length;

  const taskCompletionRate = adminOwnTasks.length > 0
    ? Math.round((adminOwnTasks.filter((t) => t.status === "COMPLETED").length / adminOwnTasks.length) * 100)
    : 0;

  const overdueInvoices = adminOwnInvoices.filter(isInvoiceOverdue);
  const overdueTasks = adminOwnTasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringDomains = domains.filter((d) => {
    if (d.domainExpiry) {
      const expiryDate = new Date(d.domainExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;
  const expiringHosting = domains.filter((d) => {
    if (d.hostingExpiry) {
      const expiryDate = new Date(d.hostingExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;
  const expiringSSL = domains.filter((d) => {
    if (d.sslExpiry) {
      const expiryDate = new Date(d.sslExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;
  const totalDomainAlerts = expiringDomains + expiringHosting + expiringSSL;

  const getRevenueByPeriod = () => {
    const periodData: Record<string, { paid: number; pending: number }> = {};
    filteredInvoices.forEach((inv) => {
      const date = new Date(inv.paidAt || inv.createdAt);
      let periodKey = "";
      if (timeRange === "week") periodKey = date.toLocaleDateString("en-US", { weekday: "short" });
      else if (timeRange === "month") periodKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      else periodKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!periodData[periodKey]) periodData[periodKey] = { paid: 0, pending: 0 };
      if (inv.status === "PAID") periodData[periodKey].paid += inv.amount;
      else periodData[periodKey].pending += inv.amount;
    });
    return Object.entries(periodData)
      .map(([period, data]) => ({ period, paid: data.paid, pending: data.pending, total: data.paid + data.pending }))
      .slice(-10);
  };

  const taskDistribution = [
    { name: "Completed", value: completedTasks, color: colors.success },
    { name: "In Progress", value: activeTasks, color: "rgba(255,255,255,0.7)" },
    { name: "Pending", value: pendingTasks, color: colors.warning },
    { name: "Pending Approval", value: pendingApproval, color: colors.info },
  ].filter((item) => item.value > 0);

  const getTopClientsByRevenue = () => {
    const clientRevenue: Record<string, { name: string; amount: number; id: number }> = {};
    filteredInvoices.forEach((inv) => {
      const clientId = inv.client?.id ?? 0;
      const clientName = inv.client?.name ?? "Unknown";
      if (!clientRevenue[clientId]) clientRevenue[clientId] = { name: clientName, amount: 0, id: clientId };
      clientRevenue[clientId].amount += inv.amount;
    });
    return Object.values(clientRevenue).sort((a, b) => b.amount - a.amount).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] w-full min-w-0">
        <SkeletonDashboard />
      </div>
    );
  }

  const revenueByPeriod = getRevenueByPeriod();
  const revMax = Math.max(...revenueByPeriod.map((d) => d.total), 1);
  const topClients = getTopClientsByRevenue();
  const recentInvoices = adminOwnInvoices
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const totalAttention =
    overdueInvoices.length + overdueTasks.length + pendingApproval + incompleteProfiles + totalDomainAlerts;

  // ---- Service-aware aggregates (Web App / Website / SMM) ----
  const smmProjects = projects.filter((p) => p.serviceType === "SMM");
  const mrr = smmProjects.reduce((s, p) => s + mnum((p.metadata as Record<string, unknown>)?.monthlyBudget), 0);
  const adBudget = smmProjects.reduce((s, p) => s + mnum((p.metadata as Record<string, unknown>)?.adBudget), 0);
  const adSpent = smmProjects.reduce((s, p) => s + mnum((p.metadata as Record<string, unknown>)?.adSpent), 0);
  const adPct = adBudget > 0 ? Math.min(100, Math.round((adSpent / adBudget) * 100)) : 0;
  const contentPlanned = smmProjects.reduce((s, p) => s + mnum((p.metadata as Record<string, unknown>)?.postsPlanned), 0);
  const contentDelivered = smmProjects.reduce((s, p) => s + mnum((p.metadata as Record<string, unknown>)?.postsDelivered), 0);
  const contentPct = contentPlanned > 0 ? Math.round((contentDelivered / contentPlanned) * 100) : 0;
  const servicesByType = SERVICE_TYPES
    .map((t) => ({ key: t.key, label: t.label, accent: t.accent, count: projects.filter((p) => (p.serviceType || "OTHER") === t.key).length }))
    .filter((t) => t.count > 0);
  const totalServices = projects.length;

  return (
    <div className="mx-auto max-w-[1400px] w-full min-w-0 space-y-6">
      <PageHeader
        title="Zulbera Analytics"
        subtitle={`Your workspace — clients, tasks, revenue, and alerts over the past ${timeRange}`}
        actions={
          <div className="flex gap-2">
            {(["week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                  timeRange === range
                    ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border border-[var(--color-tab-active-border)]"
                    : "text-[var(--color-tab-inactive-text)] border border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      {/* Key metrics — Zulbera only */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          tone="success"
          icon={<CircleDollarSign className="h-5 w-5" />}
          onClick={() => navigate("/admin/zulbera/invoices")}
          hint={
            <>
              <span className="font-semibold text-[var(--color-success-text)]">{formatCurrency(totalPaid)}</span> paid
              {" · "}
              <span className="font-semibold text-[var(--color-warning-text)]">{formatCurrency(totalPending)}</span> pending
            </>
          }
        />
        <StatCard
          label="Active Clients"
          value={totalClients}
          tone="info"
          icon={<Users className="h-5 w-5" />}
          onClick={() => navigate("/admin/zulbera/clients")}
          hint={
            incompleteProfiles > 0 ? (
              <span className="font-semibold text-[var(--color-destructive-text)]">{incompleteProfiles} incomplete profiles</span>
            ) : (
              <span className="text-[var(--color-success-text)]">All profiles complete</span>
            )
          }
        />
        <StatCard
          label="Task Completion"
          value={`${taskCompletionRate}%`}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
          onClick={() => navigate("/admin/zulbera/tasks")}
          hint={`${adminOwnTasks.filter((t) => t.status === "COMPLETED").length} of ${adminOwnTasks.length} tasks completed`}
        />
        <StatCard
          label="Attention Needed"
          value={totalAttention}
          tone={totalAttention > 0 ? "danger" : "success"}
          icon={<AlertTriangle className="h-5 w-5" />}
          onClick={() => navigate("/alerts")}
          hint={`${overdueTasks.length} tasks · ${overdueInvoices.length} invoices · ${pendingApproval} approvals · ${incompleteProfiles} profiles · ${totalDomainAlerts} domains`}
        />
      </div>

      {/* Services & spend — service-aware */}
      <div className="bento">
        <div className="col-4 card-panel p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="section-title">Services</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{totalServices} active · {servicesByType.length} type{servicesByType.length !== 1 ? "s" : ""}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"><Layers className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 space-y-3">
            {servicesByType.length ? servicesByType.map((t) => (
              <div key={t.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} /><span className="text-[var(--color-text-secondary)]">{t.label}</span></span>
                  <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{t.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full" style={{ width: `${totalServices ? (t.count / totalServices) * 100 : 0}%`, background: t.accent }} /></div>
              </div>
            )) : <p className="text-sm text-[var(--color-text-muted)]">No services yet — add one from Tasks → Projects.</p>}
          </div>
          {mrr > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm">
              <span className="text-[var(--color-text-muted)]">Recurring (retainers)</span>
              <span className="font-bold text-[var(--color-text-primary)]">{formatCurrency(mrr)}/mo</span>
            </div>
          )}
        </div>

        <div className="col-4 card-panel p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="section-title">Ad spend</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{smmProjects.length} social service{smmProjects.length !== 1 ? "s" : ""}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"><Megaphone className="h-5 w-5" /></span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{formatCurrency(adSpent)} <span className="text-base font-medium text-[var(--color-text-muted)]">/ {formatCurrency(adBudget)}</span></p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full transition-all" style={{ width: `${adPct}%`, background: adPct >= 90 ? "var(--color-destructive-text)" : "var(--color-warning-text)" }} /></div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{adPct}% of ad budget used{adBudget > 0 && adSpent > adBudget ? " · over budget" : ""}</p>
        </div>

        <div className="col-4 card-panel p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="section-title">Content delivery</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">designs &amp; posts (SMM)</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-info-bg)] text-[var(--color-info-text)]"><CheckCircle2 className="h-5 w-5" /></span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{contentPct}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full transition-all" style={{ width: `${contentPct}%`, background: "var(--color-info-text)" }} /></div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{contentDelivered} of {contentPlanned} delivered</p>
        </div>
      </div>

      {/* Charts — bento */}
      <div className="bento">
        <div className="col-8 card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Revenue</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Paid vs pending · per period</p>
            </div>
            <div className="flex gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[rgba(255,255,255,0.9)]" />Paid</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-warning-text)]" />Pending</span>
            </div>
          </div>
          {revenueByPeriod.length > 0 ? (
            <div className="flex h-[240px] items-end gap-1.5 sm:h-[280px] sm:gap-3">
              {revenueByPeriod.map((d) => (
                <div key={d.period} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full flex-1 flex-col justify-end">
                    <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-solid)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-primary)] opacity-0 shadow-lg transition group-hover:opacity-100">
                      {formatCurrency(d.total)}
                    </div>
                    <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.pending / revMax) * 100}%`, background: "var(--color-warning-text)", opacity: 0.5 }} />
                    <div className="w-full rounded-b-sm transition-all" style={{ height: `${(d.paid / revMax) * 100}%`, background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.45))", borderTopLeftRadius: d.pending ? 0 : 6, borderTopRightRadius: d.pending ? 0 : 6 }} />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-[var(--color-text-muted)]">{d.period}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={<CircleDollarSign className="h-6 w-6" />}
              title="No revenue data"
              description="No invoices were created in the selected period."
            />
          )}
        </div>

        <div className="col-4 card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
          <h3 className="section-title mb-4">Task Status</h3>
          {taskDistribution.length > 0 ? (
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskDistribution} cx="50%" cy="50%" labelLine={false} innerRadius={58} outerRadius={90} paddingAngle={3} cornerRadius={6} stroke="none" dataKey="value">
                    {taskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                  <Legend wrapperStyle={legendWrapperStyle} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              compact
              icon={<ClipboardList className="h-6 w-6" />}
              title="No task data"
              description="No tasks found for the selected period."
            />
          )}
        </div>

        <div className="col-5 card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
          <h3 className="section-title mb-4">Top Clients by Revenue</h3>
          {topClients.length > 0 ? (
            <div className="h-[240px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--color-text-primary)" strokeOpacity={0.07} horizontal={false} />
                  <XAxis type="number" tick={axisTick} tickFormatter={(v) => formatCurrency(v)} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "var(--color-surface-2)" }} />
                  <Bar dataKey="amount" fill="rgba(255,255,255,0.85)" radius={[0, 8, 8, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              compact
              icon={<Users className="h-6 w-6" />}
              title="No client revenue data"
              description="Revenue by client appears once invoices exist for this period."
            />
          )}
        </div>

        {/* Quick actions + Recent */}
        <div className="col-7 card-panel p-5 sm:p-6">
          <h3 className="section-title mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/admin/zulbera/clients")}
              className="row-hover flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-all"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                  <Plus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)]">Create New Client</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Add a new client</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
            </button>
            <button
              onClick={() => navigate("/admin/zulbera/tasks")}
              className="row-hover flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-all"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)]">Create New Task</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Assign a task</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
            </button>
            <button
              onClick={() => navigate("/admin/zulbera/invoices")}
              className="row-hover flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-all"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)]">Generate Invoice</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Create and send an invoice</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
            </button>
          </div>
        </div>

        <div className="col-12 card-panel p-5 sm:p-6">
          <h3 className="section-title mb-4">Recent Invoices</h3>
          {recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="row-hover flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => navigate("/admin/zulbera/invoices")}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      Invoice #{inv.invoiceNumber} — {inv.client?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(inv.amount)} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} className="shrink-0 self-start sm:self-center" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={<FileText className="h-6 w-6" />}
              title="No recent invoices"
              description="New invoices will show up here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
