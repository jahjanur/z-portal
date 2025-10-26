import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { formatCurrency, formatDate } from "../utils";
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

interface User {
  id: number;
  role: "ADMIN" | "WORKER" | "CLIENT";
  name: string;
  email: string;
  createdAt: string;
  profileStatus?: string;
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
  client?: { name: string; id: number };
  worker?: { name: string; id: number };
}

interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingExpiry?: string;
  sslExpiry?: string;
  client: {
    id: number;
    name: string;
    company?: string;
  };
}

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export default function HomePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [usersRes, invoicesRes, tasksRes] = await Promise.all([
        API.get<User[]>("/users"),
        API.get<Invoice[]>("/invoices"),
        API.get<Task[]>("/tasks"),
      ]);
      setUsers(usersRes.data);
      setInvoices(invoicesRes.data);
      setTasks(tasksRes.data);

      const clientUsers = usersRes.data.filter(u => u.role === "CLIENT");
      const allDomains: Domain[] = [];
      for (const client of clientUsers) {
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
      invoices: invoices.filter(i => new Date(i.createdAt) >= startDate),
      tasks: tasks.filter(t => new Date(t.createdAt) >= startDate),
    };
  };

  const { invoices: filteredInvoices, tasks: filteredTasks } = getFilteredData();

  const totalClients = users.filter(u => u.role === "CLIENT").length;
  const totalWorkers = users.filter(u => u.role === "WORKER").length;
  const incompleteProfiles = users.filter(u => u.role === "CLIENT" && u.profileStatus === "INCOMPLETE").length;
  
  const totalPaid = filteredInvoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  const totalPending = filteredInvoices.filter(i => i.status === "PENDING").reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = totalPaid + totalPending;
  
  const completedTasks = filteredTasks.filter(t => t.status === "COMPLETED").length;
  const activeTasks = filteredTasks.filter(t => t.status === "IN_PROGRESS").length;
  const pendingTasks = filteredTasks.filter(t => t.status === "PENDING").length;
  const pendingApproval = tasks.filter(t => t.status === "PENDING_APPROVAL").length;

  const overdueInvoices = invoices.filter(i => 
    i.status === "PENDING" && i.dueDate && new Date(i.dueDate) < new Date()
  );

  const overdueTasks = tasks.filter(t => 
    t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDomains = domains.filter(d => {
    if (d.domainExpiry) {
      const expiryDate = new Date(d.domainExpiry);
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
    { name: "In Progress", value: activeTasks, color: colors.primary },
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
      const workerId = task.worker?.id || 0;
      const workerName = task.worker?.name || "Unassigned";
      
      if (!workerStats[workerId]) {
        workerStats[workerId] = { name: workerName, completed: 0, total: 0, id: workerId };
      }
      workerStats[workerId].total += 1;
      if (task.status === "COMPLETED") {
        workerStats[workerId].completed += 1;
      }
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
    navigate("/dashboard", { state: { activeTab: "clients" } });
  };

  const handleCreateTask = () => {
    navigate("/dashboard", { state: { activeTab: "tasks" } });
  };

  const handleCreateInvoice = () => {
    navigate("/dashboard", { state: { activeTab: "invoices" } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-gray-50 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Admin <span style={{ color: colors.primary }}>Analytics</span>
            </h1>
            <p className="mt-2 text-gray-600">
              Real-time insights and company-wide analytics
            </p>
          </div>
          <div className="flex gap-2">
            {(["week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  timeRange === range
                    ? "text-white"
                    : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                }`}
                style={timeRange === range ? { backgroundColor: colors.primary } : {}}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <div 
            className="relative p-6 overflow-hidden transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-lg"
            onClick={() => navigate("/revenue")}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: colors.primary, transform: 'translate(30%, -30%)' }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
                  <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: colors.primary }}>{formatCurrency(totalRevenue)}</p>
              <p className="mt-2 text-sm text-gray-500">
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span> paid • 
                <span className="font-semibold text-amber-600"> {formatCurrency(totalPending)}</span> pending
              </p>
            </div>
          </div>

          {/* Clients */}
          <div 
            className="relative p-6 overflow-hidden transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-lg"
            onClick={() => navigate("/clients")}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: colors.accent, transform: 'translate(30%, -30%)' }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-600">Active Clients</p>
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.accent}15` }}>
                  <svg className="w-5 h-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: colors.accent }}>{totalClients}</p>
              <p className="mt-2 text-sm text-gray-500">
                {incompleteProfiles > 0 && (
                  <span className="font-semibold text-red-600">{incompleteProfiles} incomplete profiles</span>
                )}
                {incompleteProfiles === 0 && <span className="text-green-600">All profiles complete</span>}
              </p>
            </div>
          </div>

          {/* Tasks */}
          <div 
            className="relative p-6 overflow-hidden transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-lg"
            onClick={() => navigate("/tasks-overview")}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: colors.success, transform: 'translate(30%, -30%)' }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-600">Task Completion</p>
                <div className="p-2 rounded-lg bg-green-50">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0}%
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {completedTasks} of {filteredTasks.length} tasks completed
              </p>
            </div>
          </div>

          {/* Alerts */}
          <div
            className="relative p-6 overflow-hidden transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-lg"
            onClick={() => navigate("/alerts")}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: colors.danger, transform: 'translate(30%, -30%)' }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-600">Attention Needed</p>
                <div className="p-2 rounded-lg bg-red-50">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {overdueInvoices.length + overdueTasks.length + pendingApproval + incompleteProfiles + totalDomainAlerts}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {overdueTasks.length} tasks • {overdueInvoices.length} invoices • {pendingApproval} approvals • {incompleteProfiles} profiles • {totalDomainAlerts} domains
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
          {/* Revenue Trend */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm lg:col-span-2 rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getRevenueByPeriod()}>
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="paid" stroke={colors.success} fillOpacity={1} fill="url(#colorPaid)" name="Paid" />
                <Area type="monotone" dataKey="pending" stroke={colors.warning} fillOpacity={1} fill="url(#colorPending)" name="Pending" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Task Distribution */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Task Status</h3>
            {taskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No task data available
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
          {/* Top Clients by Revenue */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Top Clients by Revenue</h3>
            {getTopClientsByRevenue().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getTopClientsByRevenue()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar 
                    dataKey="amount" 
                    fill={colors.primary} 
                    radius={[0, 8, 8, 0]}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No client revenue data
              </div>
            )}
          </div>

          {/* Worker Performance */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Worker Performance</h3>
            {getWorkerPerformance().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getWorkerPerformance()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill={colors.success} name="Completed" />
                  <Bar dataKey="total" fill={colors.info} name="Total Tasks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No worker performance data
              </div>
            )}
          </div>
        </div>

        {/* Task Completion Trend */}
        <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <h3 className="mb-4 text-lg font-bold text-gray-900">Task Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getTaskCompletionTrend()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="completed" stroke={colors.success} strokeWidth={2} name="Completed Tasks" />
              <Line yAxisId="left" type="monotone" dataKey="total" stroke={colors.info} strokeWidth={2} name="Total Tasks" />
              <Line yAxisId="right" type="monotone" dataKey="rate" stroke={colors.accent} strokeWidth={2} name="Completion Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleCreateClient}
                className="flex items-center justify-between w-full p-4 text-left transition-all border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
                    <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Create New Client</p>
                    <p className="text-sm text-gray-500">Add a new client to the system</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button 
                onClick={handleCreateTask}
                className="flex items-center justify-between w-full p-4 text-left transition-all border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.accent}15` }}>
                    <svg className="w-5 h-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Create New Task</p>
                    <p className="text-sm text-gray-500">Assign a task to a worker</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button 
                onClick={handleCreateInvoice}
                className="flex items-center justify-between w-full p-4 text-left transition-all border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Generate Invoice</p>
                    <p className="text-sm text-gray-500">Create and send an invoice</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Activity</h3>
            <div className="space-y-3">
              {invoices
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-start gap-3 p-3 transition-all border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:border-gray-300"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                  >
                    <div className={`p-2 rounded-lg ${invoice.status === "PAID" ? "bg-green-50" : "bg-amber-50"}`}>
                      <svg className={`w-4 h-4 ${invoice.status === "PAID" ? "text-green-600" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Invoice #{invoice.invoiceNumber} - {invoice.client?.name || "Unknown Client"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(invoice.amount)} • {invoice.status}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(invoice.createdAt)}</p>
                    </div>
                  </div>
                ))}
              {invoices.length === 0 && (
                <p className="py-8 text-sm text-center text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* System Health & Alerts */}
        <div className="grid grid-cols-1 gap-6 mt-8 lg:grid-cols-3">
          {/* System Health */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Active Workers</span>
                  <span className="text-sm font-bold text-green-600">{totalWorkers}/{totalWorkers}</span>
                </div>
                <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <div className="h-full transition-all duration-500 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Client Onboarding</span>
                  <span className="text-sm font-bold" style={{ color: colors.primary }}>
                    {totalClients - incompleteProfiles}/{totalClients}
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <div 
                    className="h-full transition-all duration-500 rounded-full" 
                    style={{ 
                      width: `${totalClients > 0 ? ((totalClients - incompleteProfiles) / totalClients) * 100 : 0}%`,
                      backgroundColor: colors.primary
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Invoice Collection</span>
                  <span className="text-sm font-bold text-amber-600">
                    {invoices.filter(i => i.status === "PAID").length}/{invoices.length}
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <div 
                    className="h-full transition-all duration-500 rounded-full bg-amber-500" 
                    style={{ width: `${invoices.length > 0 ? (invoices.filter(i => i.status === "PAID").length / invoices.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Alerts */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Urgent Alerts</h3>
            <div className="space-y-3">
              {pendingApproval > 0 && (
                <div 
                  className="flex items-start gap-3 p-4 transition-all border-l-4 rounded-r-lg cursor-pointer bg-purple-50 hover:shadow-md" 
                  style={{ borderColor: colors.accent }}
                  onClick={() => navigate("/dashboard", { state: { activeTab: "tasks" } })}
                >
                  <svg className="w-5 h-5 mt-0.5" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{pendingApproval} tasks awaiting approval</p>
                    <p className="text-sm text-gray-600">Review and approve completed work</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {overdueTasks.length > 0 && (
                <div 
                  className="flex items-start gap-3 p-4 transition-all border-l-4 border-red-500 rounded-r-lg cursor-pointer bg-red-50 hover:shadow-md"
                  onClick={() => navigate("/dashboard", { state: { activeTab: "tasks" } })}
                >
                  <svg className="w-5 h-5 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{overdueTasks.length} overdue tasks</p>
                    <p className="text-sm text-gray-600">Tasks past their deadline need attention</p>
                    <div className="mt-2 space-y-1">
                      {overdueTasks.slice(0, 3).map(task => (
                        <p key={task.id} className="text-xs text-gray-500">• {task.title}</p>
                      ))}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {overdueInvoices.length > 0 && (
                <div 
                  className="flex items-start gap-3 p-4 transition-all border-l-4 rounded-r-lg cursor-pointer bg-amber-50 border-amber-500 hover:shadow-md"
                  onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                >
                  <svg className="w-5 h-5 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{overdueInvoices.length} overdue invoices</p>
                    <p className="text-sm text-gray-600">
                      Total: {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                    </p>
                    <div className="mt-2 space-y-1">
                      {overdueInvoices.slice(0, 3).map(inv => (
                        <p key={inv.id} className="text-xs text-gray-500">
                          • Invoice #{inv.invoiceNumber} - {inv.client?.name}
                        </p>
                      ))}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {incompleteProfiles > 0 && (
                <div 
                  className="flex items-start gap-3 p-4 transition-all border-l-4 border-blue-500 rounded-r-lg cursor-pointer bg-blue-50 hover:shadow-md"
                  onClick={() => navigate("/dashboard", { state: { activeTab: "clients" } })}
                >
                  <svg className="w-5 h-5 mt-0.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{incompleteProfiles} incomplete client profiles</p>
                    <p className="text-sm text-gray-600">Clients need to complete their onboarding</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {pendingApproval === 0 && overdueTasks.length === 0 && overdueInvoices.length === 0 && incompleteProfiles === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900">All clear!</p>
                    <p className="text-sm text-gray-500">No urgent items require attention</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}