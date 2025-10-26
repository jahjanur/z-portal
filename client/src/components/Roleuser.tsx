import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import StatsCard from "./user/StatsCard";
import ProgressBar from "./user/ProgressBar";
import RecentProjectCard from "./user/RecentProjectCard";
import RecentInvoiceCard from "./user/RecentInvoiceCard";
import ProjectCard from "./user/ProjectCard";
import InvoiceCard from "./user/InvoiceCard";
import FileCard from "./user/FileCard";
import FilesBySection from "./user/FilesSection";
import { getStatusColor, formatDate, formatCurrency, getDaysUntilDue } from "../utils";

interface Worker {
  id: number;
  name: string;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  dueDate?: string | null;
  createdAt: string;
  worker?: Worker | null;
  files?: TaskFile[];
}

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  section: string | null;
  uploadedAt: string;
}

interface Invoice {
  id: number;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
  invoiceNumber: string;
  description?: string | null;
  paidAt?: string | null;
}

interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string | null;
  hostingPlan?: string | null;
  hostingExpiry?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  light: "#F8F9FA",
  dark: "#1A1A2E",
};

const RoleUser: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "invoices" | "files" | "domains">("overview");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

const fetchAll = async () => {
  setLoading(true);
  setError(null);
  try {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      throw new Error("User ID not found. Please login again.");
    }

    console.log("🔍 Fetching data for userId:", userId);

    const [tasksRes, invoicesRes, domainsRes] = await Promise.all([
      API.get<Task[]>("/tasks"),
      API.get<Invoice[]>("/invoices"),
      API.get<Domain[]>(`/domains/client/${userId}`),
    ]);
    
    console.log("✅ Tasks:", tasksRes.data.length);
    console.log("✅ Invoices:", invoicesRes.data.length);
    console.log("✅ Domains:", domainsRes.data.length, domainsRes.data);
    
    setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
    setDomains(Array.isArray(domainsRes.data) ? domainsRes.data : []);
  } catch (err: unknown) {
    console.error("❌ Fetch error:", err);
    setError(err instanceof Error ? err.message : "Failed to fetch data");
  } finally {
    setLoading(false);
  }
};

  const completedTasks = tasks.filter(t => t.status?.toUpperCase() === "COMPLETED").length;
  const inProgressTasks = tasks.filter(t => t.status?.toUpperCase() === "IN_PROGRESS").length;
  const pendingTasks = tasks.filter(t => t.status?.toUpperCase() === "PENDING").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const paidInvoices = invoices.filter(i => i.status?.toUpperCase() === "PAID");
  const pendingInvoices = invoices.filter(i => i.status?.toUpperCase() === "PENDING");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const activeDomains = domains.filter(d => d.isActive);
  const primaryDomain = domains.find(d => d.isPrimary);

  const allFiles = tasks.flatMap(task => 
    (task.files || []).map(file => ({ ...file, taskTitle: task.title }))
  );

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "ALL" || task.status?.toUpperCase() === statusFilter;
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === "ALL" || invoice.status?.toUpperCase() === statusFilter;
    const matchesSearch = invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredDomains = domains.filter(domain => {
    const matchesSearch = domain.domainName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const isDomainExpiringSoon = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const isDomainExpired = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
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
          <span className="text-lg font-medium text-gray-700">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <p className="mb-2 text-lg font-semibold text-red-800">Error:</p>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 mt-4 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Client <span style={{ color: colors.primary }}>Dashboard</span>
          </h1>
          <p className="text-lg text-gray-600">Track your projects, invoices, files, and domains</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {(["overview", "tasks", "invoices", "files", "domains"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? "text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200"
                }`}
                style={activeTab === tab ? { backgroundColor: colors.primary } : {}}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <StatsCard
                title="Total Projects"
                value={tasks.length.toString()}
                subtitle={`${completionRate}% completed`}
                icon={
                  <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                iconBgColor={`${colors.primary}15`}
              />
              <StatsCard
                title="In Progress"
                value={inProgressTasks.toString()}
                subtitle="Active projects"
                icon={
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                iconBgColor="rgba(59, 130, 246, 0.1)"
                valueColor="#2563EB"
              />
              <StatsCard
                title="Total Invoiced"
                value={formatCurrency(totalInvoiced)}
                subtitle={`${invoices.length} invoices`}
                icon={
                  <svg className="w-5 h-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                iconBgColor={`${colors.accent}15`}
                valueColor={colors.accent}
              />
              <StatsCard
                title="Active Domains"
                value={activeDomains.length.toString()}
                subtitle={`${domains.length} total`}
                icon={
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                }
                iconBgColor="rgba(147, 51, 234, 0.1)"
                valueColor="#9333EA"
              />
            </div>

            {/* Progress Chart */}
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Project Progress</h3>
              <div className="space-y-4">
                <ProgressBar
                  label="Completed"
                  current={completedTasks}
                  total={tasks.length}
                  color="#10B981"
                  labelColor="text-green-600"
                />
                <ProgressBar
                  label="In Progress"
                  current={inProgressTasks}
                  total={tasks.length}
                  color="#3B82F6"
                  labelColor="text-blue-600"
                />
                <ProgressBar
                  label="Pending"
                  current={pendingTasks}
                  total={tasks.length}
                  color="#F59E0B"
                  labelColor="text-amber-600"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Projects</h3>
                <div className="space-y-3">
                  {tasks.slice(0, 3).map((task) => (
                    <RecentProjectCard
                      key={task.id}
                      task={task}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                  {tasks.length === 0 && (
                    <p className="py-8 text-center text-gray-500">No projects yet</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="w-full px-4 py-2 mt-4 text-sm font-semibold text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  View All Projects
                </button>
              </div>

              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Invoices</h3>
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <RecentInvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      getStatusColor={getStatusColor}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      primaryColor={colors.primary}
                    />
                  ))}
                  {invoices.length === 0 && (
                    <p className="py-8 text-center text-gray-500">No invoices yet</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className="w-full px-4 py-2 mt-4 text-sm font-semibold text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  View All Invoices
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      statusFilter === status
                        ? "text-white"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                    }`}
                    style={statusFilter === status ? { backgroundColor: colors.primary } : {}}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              />
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center bg-white border border-gray-200 rounded-2xl">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">No projects found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <ProjectCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                    getDaysUntilDue={getDaysUntilDue}
                    primaryColor={colors.primary}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {["ALL", "PENDING", "PAID"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      statusFilter === status
                        ? "text-white"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                    }`}
                    style={statusFilter === status ? { backgroundColor: colors.primary } : {}}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              />
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
              {filteredInvoices.length === 0 ? (
                <div className="py-12 text-center bg-white border border-gray-200 rounded-2xl">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">No invoices found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    getStatusColor={getStatusColor}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getDaysUntilDue={getDaysUntilDue}
                    primaryColor={colors.primary}
                  />
                ))
              )}
            </div>

            {/* Invoice Summary */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <StatsCard
                title="Paid Invoices"
                value={formatCurrency(totalPaid)}
                subtitle={`${paidInvoices.length} invoices paid`}
                icon={
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
                iconBgColor="rgba(16, 185, 129, 0.1)"
                valueColor="#059669"
              />
              <StatsCard
                title="Pending Invoices"
                value={formatCurrency(totalPending)}
                subtitle={`${pendingInvoices.length} invoices pending`}
                icon={
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                iconBgColor="rgba(245, 158, 11, 0.1)"
                valueColor="#D97706"
              />
            </div>
          </div>
        )}
        
        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="space-y-6">
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">All Project Files</h2>
                <span className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: colors.primary }}>
                  {allFiles.length} files
                </span>
              </div>
              
              {allFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">No files uploaded yet</p>
                  <p className="text-sm text-gray-500">Files will appear here once uploaded to your projects</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      formatDate={formatDate}
                      primaryColor={colors.primary}
                    />
                  ))}
                </div>
              )}
            {/* Files by Section */}
            {allFiles.length > 0 && (
              <FilesBySection files={allFiles} primaryColor={colors.primary} />
            )}
            </div>

          </div>
        )}

        {/* Domains Tab */}
        {activeTab === "domains" && (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex justify-end">
              <input
                type="text"
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              />
            </div>

            {/* Primary Domain Card */}
            {primaryDomain && (
              <div className="p-6 border-2 border-purple-200 shadow-sm bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-gray-900">Primary Domain</h3>
                    </div>
                    <a 
                      href={`https://${primaryDomain.domainName}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-2xl font-bold text-purple-600 transition-colors hover:text-purple-700"
                    >
                      {primaryDomain.domainName}
                    </a>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold text-white bg-purple-600 rounded-full">
                    PRIMARY
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {primaryDomain.hostingPlan && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span><strong>Plan:</strong> {primaryDomain.hostingPlan}</span>
                    </div>
                  )}
                  {primaryDomain.domainExpiry && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={isDomainExpired(primaryDomain.domainExpiry) ? "text-red-600 font-semibold" : isDomainExpiringSoon(primaryDomain.domainExpiry) ? "text-amber-600 font-semibold" : "text-gray-700"}>
                        <strong>Domain expires:</strong> {formatDate(primaryDomain.domainExpiry)}
                      </span>
                    </div>
                  )}
                  {primaryDomain.hostingExpiry && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={isDomainExpired(primaryDomain.hostingExpiry) ? "text-red-600 font-semibold" : isDomainExpiringSoon(primaryDomain.hostingExpiry) ? "text-amber-600 font-semibold" : "text-gray-700"}>
                        <strong>Hosting expires:</strong> {formatDate(primaryDomain.hostingExpiry)}
                      </span>
                    </div>
                  )}
                </div>
                {primaryDomain.notes && (
                  <div className="p-3 mt-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600"><strong>Notes:</strong> {primaryDomain.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Domains List */}
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">All Domains</h2>
                <span className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: colors.primary }}>
                  {filteredDomains.length} domains
                </span>
              </div>

              {filteredDomains.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">No domains found</p>
                  <p className="text-sm text-gray-500">Contact your administrator to add domains</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDomains.map((domain) => (
                    <div
                      key={domain.id}
                      className={`p-5 border-2 rounded-xl transition-all hover:shadow-md ${
                        domain.isPrimary 
                          ? "border-purple-200 bg-purple-50" 
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <a 
                              href={`https://${domain.domainName}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xl font-bold text-gray-900 transition-colors hover:text-purple-600"
                            >
                              {domain.domainName}
                            </a>
                            {domain.isPrimary && (
                              <span className="px-2 py-0.5 text-xs font-bold text-white bg-purple-600 rounded-full">
                                PRIMARY
                              </span>
                            )}
                            {!domain.isActive && (
                              <span className="px-2 py-0.5 text-xs font-bold text-white bg-gray-500 rounded-full">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 mt-3 md:grid-cols-2 lg:grid-cols-3">
                            {domain.hostingPlan && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                                <span>{domain.hostingPlan}</span>
                              </div>
                            )}
                            
                            {domain.domainExpiry && (
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className={isDomainExpired(domain.domainExpiry) ? "text-red-600 font-semibold" : isDomainExpiringSoon(domain.domainExpiry) ? "text-amber-600 font-semibold" : "text-gray-600"}>
                                  Domain: {formatDate(domain.domainExpiry)}
                                  {isDomainExpired(domain.domainExpiry) && " (Expired)"}
                                  {isDomainExpiringSoon(domain.domainExpiry) && !isDomainExpired(domain.domainExpiry) && " (Expiring Soon)"}
                                </span>
                              </div>
                            )}
                            
                            {domain.hostingExpiry && (
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className={isDomainExpired(domain.hostingExpiry) ? "text-red-600 font-semibold" : isDomainExpiringSoon(domain.hostingExpiry) ? "text-amber-600 font-semibold" : "text-gray-600"}>
                                  Hosting: {formatDate(domain.hostingExpiry)}
                                  {isDomainExpired(domain.hostingExpiry) && " (Expired)"}
                                  {isDomainExpiringSoon(domain.hostingExpiry) && !isDomainExpired(domain.hostingExpiry) && " (Expiring Soon)"}
                                </span>
                              </div>
                            )}
                          </div>

                          {domain.notes && (
                            <div className="p-3 mt-3 rounded-lg bg-gray-50">
                              <p className="text-sm text-gray-600">{domain.notes}</p>
                            </div>
                          )}
                        </div>

                        <a 
                          href={`https://${domain.domainName}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Domain Stats */}
            {domains.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StatsCard
                  title="Total Domains"
                  value={domains.length.toString()}
                  subtitle={`${activeDomains.length} active`}
                  icon={
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  }
                  iconBgColor="rgba(147, 51, 234, 0.1)"
                  valueColor="#9333EA"
                />
                <StatsCard
                  title="Expiring Soon"
                  value={domains.filter(d => isDomainExpiringSoon(d.domainExpiry) || isDomainExpiringSoon(d.hostingExpiry)).length.toString()}
                  subtitle="Within 30 days"
                  icon={
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                  iconBgColor="rgba(245, 158, 11, 0.1)"
                  valueColor="#D97706"
                />
                <StatsCard
                  title="Expired"
                  value={domains.filter(d => isDomainExpired(d.domainExpiry) || isDomainExpired(d.hostingExpiry)).length.toString()}
                  subtitle="Needs renewal"
                  icon={
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  iconBgColor="rgba(239, 68, 68, 0.1)"
                  valueColor="#DC2626"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleUser;