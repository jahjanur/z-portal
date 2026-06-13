import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { formatCurrency, formatDate, computeInvoiceRevenue } from "../utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
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
  Clock,
  UserRound,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonDashboard } from "../components/ui/Skeleton";

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
  expirationDate?: string | null;
  hostingExpiry?: string;
  sslExpiry?: string;
  client: {
    id: number;
    name: string;
    company?: string;
  };
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

interface EraSphereStats {
  totalPartners: number;
  totalClients: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [erasphereStats, setEraSphereStats] = useState<EraSphereStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, invoicesRes, tasksRes, erasphereRes] = await Promise.all([
        API.get<User[]>("/users"),
        API.get<Invoice[]>("/invoices"),
        API.get<Task[]>("/tasks"),
        API.get<{ stats: EraSphereStats }>("/users/erasphere/admin-analytics").catch(() => ({ data: { stats: null } })),
      ]);
      setUsers(usersRes.data);
      setInvoices(invoicesRes.data);
      setTasks(tasksRes.data);
      setEraSphereStats(erasphereRes.data?.stats ?? null);

      // Domains: fetch only for admin's own clients (not EraSphere-referred)
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
      console.error("Error fetching overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // Admin's own section: only clients he has reached (not referred by EraSphere)
  const adminOwnClientIds = users
    .filter((u) => u.role === "CLIENT" && (u.referredById == null))
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
  const totalWorkers = users.filter(u => u.role === "WORKER").length;
  const incompleteProfiles = users.filter(
    (u) => u.role === "CLIENT" && u.referredById == null && u.profileStatus === "INCOMPLETE"
  ).length;

  // Outstanding (pending) = not paid, so paid + pending = total and it stays
  // consistent with the server's EraSphere stats merged in below.
  const { totalPaid, totalPending, totalRevenue } = computeInvoiceRevenue(filteredInvoices);

  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED").length;
  const activeTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingTasks = filteredTasks.filter((t) => t.status === "PENDING").length;
  const pendingApproval = adminOwnTasks.filter((t) => t.status === "PENDING_APPROVAL").length;

  const overdueInvoices = adminOwnInvoices.filter(
    (i) => i.status === "PENDING" && i.dueDate && new Date(i.dueDate) < new Date()
  );

  const overdueTasks = adminOwnTasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDomains = domains.filter(d => {
    const expiry = d.expirationDate || d.domainExpiry;
    if (expiry) {
      const expiryDate = new Date(expiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;

  const expiringHosting = domains.filter(d => {
    if (d.hostingExpiry) {
      const expiryDate = new Date(d.hostingExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;

  const expiringSSL = domains.filter(d => {
    if (d.sslExpiry) {
      const expiryDate = new Date(d.sslExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  }).length;

  const totalDomainAlerts = expiringDomains + expiringHosting + expiringSSL;

  // Merged totals: Zulbera + EraSphere (so e.g. 5k + 5k = 10k)
  const totalRevenueMerged = totalRevenue + (erasphereStats?.totalRevenue ?? 0);
  const totalPaidMerged = totalPaid + (erasphereStats?.paidRevenue ?? 0);
  const totalPendingMerged = totalPending + (erasphereStats?.pendingRevenue ?? 0);
  const totalClientsMerged = totalClients + (erasphereStats?.totalClients ?? 0);
  const mergedTotalTasks = adminOwnTasks.length + (erasphereStats?.totalTasks ?? 0);
  const mergedCompletedTasks = adminOwnTasks.filter((t) => t.status === "COMPLETED").length + (erasphereStats?.completedTasks ?? 0);
  const taskCompletionRateMerged = mergedTotalTasks > 0 ? Math.round((mergedCompletedTasks / mergedTotalTasks) * 100) : 0;

  const getRevenueByPeriod = () => {
    const periodData: Record<string, { paid: number; pending: number }> = {};

    filteredInvoices.forEach(inv => {
      const date = new Date(inv.paidAt || inv.createdAt);
      let periodKey = "";

      if (timeRange === "week") {
        periodKey = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (timeRange === "month") {
        periodKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      if (!periodData[periodKey]) {
        periodData[periodKey] = { paid: 0, pending: 0 };
      }

      if (inv.status === "PAID") {
        periodData[periodKey].paid += inv.amount;
      } else {
        periodData[periodKey].pending += inv.amount;
      }
    });

    return Object.entries(periodData)
      .map(([period, data]) => ({
        period,
        paid: data.paid,
        pending: data.pending,
        total: data.paid + data.pending,
      }))
      .slice(-10);
  };

  const getTaskCompletionTrend = () => {
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
    const dataPoints = timeRange === "week" ? 7 : timeRange === "month" ? 10 : 12;

    return Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - ((days / dataPoints) * (dataPoints - 1 - i)));
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = filteredTasks.filter(t => {
        const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
        return taskDate <= dateStr;
      });

      const completed = dayTasks.filter(t => t.status === "COMPLETED").length;
      const total = dayTasks.length;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  };

  const taskDistribution = [
    { name: "Completed", value: completedTasks, color: colors.success },
    { name: "In Progress", value: activeTasks, color: "rgba(255,255,255,0.7)" },
    { name: "Pending", value: pendingTasks, color: colors.warning },
    { name: "Pending Approval", value: pendingApproval, color: colors.info },
  ].filter(item => item.value > 0);

  const getTopClientsByRevenue = () => {
    const clientRevenue: Record<string, { name: string; amount: number; id: number }> = {};

    filteredInvoices.forEach(inv => {
      const clientId = inv.client?.id || 0;
      const clientName = inv.client?.name || "Unknown";

      if (!clientRevenue[clientId]) {
        clientRevenue[clientId] = { name: clientName, amount: 0, id: clientId };
      }
      clientRevenue[clientId].amount += inv.amount;
    });

    return Object.values(clientRevenue)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const getWorkerPerformance = () => {
    const workerStats: Record<string, { name: string; completed: number; total: number; id: number }> = {};

    filteredTasks.forEach(task => {
      const workers = task.workers?.map((tw) => tw.user) || [];
      if (workers.length === 0) {
        const id = 0;
        if (!workerStats[id]) workerStats[id] = { name: "Unassigned", completed: 0, total: 0, id: 0 };
        workerStats[id].total += 1;
        if (task.status === "COMPLETED") workerStats[id].completed += 1;
        return;
      }
      workers.forEach((user) => {
        const workerId = user.id;
        if (!workerStats[workerId]) {
          workerStats[workerId] = { name: user.name, completed: 0, total: 0, id: workerId };
        }
        workerStats[workerId].total += 1;
        if (task.status === "COMPLETED") workerStats[workerId].completed += 1;
      });
    });

    return Object.values(workerStats)
      .map(stats => ({
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  };

  const handleCreateClient = () => {
    navigate("/admin/zulbera/clients");
  };

  const handleCreateTask = () => {
    navigate("/admin/zulbera/tasks");
  };

  const handleCreateInvoice = () => {
    navigate("/admin/zulbera/invoices");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-transparent px-4 py-24 md:px-8">
        <div className="mx-auto max-w-7xl min-w-0">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  const revenueByPeriod = getRevenueByPeriod();
  const topClients = getTopClientsByRevenue();
  const workerPerformance = getWorkerPerformance();
  const recentInvoices = adminOwnInvoices
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const totalAttention =
    overdueInvoices.length + overdueTasks.length + pendingApproval + incompleteProfiles + totalDomainAlerts;

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-transparent px-4 py-24 md:px-8">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6">
        <PageHeader
          title="Analytics"
          subtitle={`Combined Zulbera + EraSphere — revenue, clients, and tasks over the past ${timeRange}`}
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

        {/* Key Metrics Grid — merged Zulbera + EraSphere totals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(totalRevenueMerged)}
            tone="success"
            icon={<CircleDollarSign className="h-5 w-5" />}
            onClick={() => navigate("/admin/zulbera/invoices")}
            hint={
              <>
                <span className="font-semibold text-[var(--color-success-text)]">{formatCurrency(totalPaidMerged)}</span> paid
                {" · "}
                <span className="font-semibold text-[var(--color-warning-text)]">{formatCurrency(totalPendingMerged)}</span> pending
                {" · Zulbera + EraSphere"}
              </>
            }
          />
          <StatCard
            label="Active Clients"
            value={totalClientsMerged}
            tone="info"
            icon={<Users className="h-5 w-5" />}
            onClick={() => navigate("/admin/zulbera/clients")}
            hint={
              <>
                {incompleteProfiles > 0 ? (
                  <span className="font-semibold text-[var(--color-destructive-text)]">{incompleteProfiles} incomplete profiles</span>
                ) : (
                  <span className="text-[var(--color-success-text)]">All Zulbera profiles complete</span>
                )}
                {" · Zulbera + EraSphere"}
              </>
            }
          />
          <StatCard
            label="Task Completion"
            value={`${taskCompletionRateMerged}%`}
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            onClick={() => navigate("/admin/zulbera/tasks")}
            hint={`${mergedCompletedTasks} of ${mergedTotalTasks} tasks completed · Zulbera + EraSphere`}
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue Trend */}
          <div className="card-panel p-5 sm:p-6 lg:col-span-2 min-w-0 overflow-hidden">
            <h3 className="section-title mb-4">Revenue Trend</h3>
            {revenueByPeriod.length > 0 ? (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByPeriod}>
                    <defs>
                      <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.warning} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.warning} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-text-primary)" strokeOpacity={0.1} />
                    <XAxis dataKey="period" tick={axisTick} />
                    <YAxis tick={axisTick} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                    <Legend wrapperStyle={legendWrapperStyle} />
                    <Area type="monotone" dataKey="paid" stroke={colors.success} fillOpacity={1} fill="url(#colorPaid)" name="Paid" />
                    <Area type="monotone" dataKey="pending" stroke={colors.warning} fillOpacity={1} fill="url(#colorPending)" name="Pending" />
                  </AreaChart>
                </ResponsiveContainer>
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

          {/* Task Distribution */}
          <div className="card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
            <h3 className="section-title mb-4">Task Status</h3>
            {taskDistribution.length > 0 ? (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                    <Legend wrapperStyle={legendWrapperStyle} />
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
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top Clients by Revenue */}
          <div className="card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
            <h3 className="section-title mb-4">Top Clients by Revenue</h3>
            {topClients.length > 0 ? (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-text-primary)" strokeOpacity={0.1} />
                    <XAxis type="number" tick={axisTick} tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis dataKey="name" type="category" width={100} tick={axisTick} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                    <Bar dataKey="amount" fill="rgba(255,255,255,0.6)" radius={[0, 8, 8, 0]} style={{ cursor: "pointer" }} />
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

          {/* Worker Performance */}
          <div className="card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
            <h3 className="section-title mb-4">Worker Performance</h3>
            {workerPerformance.length > 0 ? (
              <div className="h-[240px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workerPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-text-primary)" strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                    <Legend wrapperStyle={legendWrapperStyle} />
                    <Bar dataKey="completed" fill={colors.success} name="Completed" />
                    <Bar dataKey="total" fill={colors.info} name="Total Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                compact
                icon={<UserRound className="h-6 w-6" />}
                title="No worker performance data"
                description="Performance appears once tasks are assigned in this period."
              />
            )}
          </div>
        </div>

        {/* Task Completion Trend */}
        <div className="card-panel p-5 sm:p-6 min-w-0 overflow-hidden">
          <h3 className="section-title mb-4">Task Completion Trend</h3>
          <div className="h-[240px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTaskCompletionTrend()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-text-primary)" strokeOpacity={0.1} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis yAxisId="left" tick={axisTick} />
                <YAxis yAxisId="right" orientation="right" tick={axisTick} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
                <Legend wrapperStyle={legendWrapperStyle} />
                <Line yAxisId="left" type="monotone" dataKey="completed" stroke={colors.success} strokeWidth={2} name="Completed Tasks" />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke={colors.info} strokeWidth={2} name="Total Tasks" />
                <Line yAxisId="right" type="monotone" dataKey="rate" stroke="rgba(255,255,255,0.7)" strokeWidth={2} name="Completion Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Quick Actions */}
          <div className="card-panel p-5 sm:p-6">
            <h3 className="section-title mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleCreateClient}
                className="row-hover flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-all"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                    <Plus className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">Create New Client</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Add a new client to the system</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
              </button>

              <button
                onClick={handleCreateTask}
                className="row-hover flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-all"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">Create New Task</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Assign a task to a worker</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
              </button>

              <button
                onClick={handleCreateInvoice}
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

          {/* Recent Activity */}
          <div className="card-panel p-5 sm:p-6">
            <h3 className="section-title mb-4">Recent Activity</h3>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="row-hover flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition-all sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => navigate("/admin/zulbera/invoices")}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        Invoice #{invoice.invoiceNumber} — {invoice.client?.name || "Unknown Client"}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatCurrency(invoice.amount)} · {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} className="shrink-0 self-start sm:self-center" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={<FileText className="h-6 w-6" />}
                title="No recent activity"
                description="New invoices will show up here."
              />
            )}
          </div>
        </div>

        {/* System Health & Alerts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* System Health */}
          <div className="card-panel p-5 sm:p-6">
            <h3 className="section-title mb-4">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">Active Workers</span>
                  <span className="text-sm font-bold text-[var(--color-success-text)]">{totalWorkers}/{totalWorkers}</span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full transition-all duration-500 rounded-full bg-[var(--color-success-text)]" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">Client Onboarding</span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                    {totalClients - incompleteProfiles}/{totalClients}
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full transition-all duration-500 rounded-full bg-[var(--color-text-secondary)]"
                    style={{
                      width: `${totalClients > 0 ? ((totalClients - incompleteProfiles) / totalClients) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">Invoice Collection</span>
                  <span className="text-sm font-bold text-[var(--color-warning-text)]">
                    {adminOwnInvoices.filter((i) => i.status === "PAID").length}/{adminOwnInvoices.length}
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full transition-all duration-500 rounded-full bg-[var(--color-warning-text)]"
                    style={{ width: `${adminOwnInvoices.length > 0 ? (adminOwnInvoices.filter((i) => i.status === "PAID").length / adminOwnInvoices.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Alerts */}
          <div className="card-panel p-5 sm:p-6 lg:col-span-2">
            <h3 className="section-title mb-4">Urgent Alerts</h3>
            <div className="space-y-3">
              {pendingApproval > 0 && (
                <div
                  className="row-hover flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 transition-all"
                  onClick={() => navigate("/admin/zulbera/tasks")}
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning-text)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-text-primary)]">{pendingApproval} tasks awaiting approval</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Review and approve completed work</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                </div>
              )}

              {overdueTasks.length > 0 && (
                <div
                  className="row-hover flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-4 transition-all"
                  onClick={() => navigate("/admin/zulbera/tasks")}
                >
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-destructive-text)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-text-primary)]">{overdueTasks.length} overdue tasks</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Tasks past their deadline need attention</p>
                    <div className="mt-2 space-y-1">
                      {overdueTasks.slice(0, 3).map((task) => (
                        <p key={task.id} className="truncate text-xs text-[var(--color-text-muted)]">• {task.title}</p>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                </div>
              )}

              {overdueInvoices.length > 0 && (
                <div
                  className="row-hover flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 transition-all"
                  onClick={() => navigate("/admin/zulbera/invoices")}
                >
                  <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning-text)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-text-primary)]">{overdueInvoices.length} overdue invoices</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Total: {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                    </p>
                    <div className="mt-2 space-y-1">
                      {overdueInvoices.slice(0, 3).map((inv) => (
                        <p key={inv.id} className="truncate text-xs text-[var(--color-text-muted)]">
                          • Invoice #{inv.invoiceNumber} - {inv.client?.name}
                        </p>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                </div>
              )}

              {incompleteProfiles > 0 && (
                <div
                  className="row-hover flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 transition-all"
                  onClick={() => navigate("/admin/zulbera/clients")}
                >
                  <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-info-text)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-text-primary)]">{incompleteProfiles} incomplete client profiles</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Clients need to complete their onboarding</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                </div>
              )}

              {pendingApproval === 0 && overdueTasks.length === 0 && overdueInvoices.length === 0 && incompleteProfiles === 0 && (
                <EmptyState
                  compact
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="All clear!"
                  description="No urgent items require attention"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
