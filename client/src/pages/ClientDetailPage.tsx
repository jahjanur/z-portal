import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import Modal from "../components/ui/Modal";

const colors = {
  primary: "#374151",
  accent: "#FFA726",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  workers?: { user: { id: number; name: string; email: string } }[];
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  fileUrl?: string;
  paymentLink?: string;
}

interface Domain {
  id: number;
  domainName: string;
  domainRegistrar?: string;
  domainExpiry?: string;
  hostingProvider?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  sslExpiry?: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  caption?: string;
  section?: string;
  isCompleted: boolean;
  completedAt?: string;
  uploadedAt: string;
  task: {
    id: number;
    title: string;
  };
}

interface Client {
  id: number;
  email: string;
  name: string;
  company?: string;
  logo?: string;
  colorHex?: string;
  address?: string;
  postalAddress?: string;
  phoneNumber?: string;
  extraEmails?: string;
  brandPattern?: string;
  shortInfo?: string;
  profileStatus?: string;
  createdAt: string;
  clientTasks: Task[];
  invoices: Invoice[];
  domains: Domain[];
}

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "invoices" | "hosting">("overview");
  
  // Files modal state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [allFiles, setAllFiles] = useState<TaskFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/users/${id}`);
      
      const [tasksRes, invoicesRes, domainsRes] = await Promise.all([
        API.get(`/tasks?clientId=${id}`),
        API.get(`/invoices?clientId=${id}`),
        API.get(`/domains/client/${id}`)
      ]);
      
      setClient({
        ...response.data,
        clientTasks: tasksRes.data,
        invoices: invoicesRes.data,
        domains: domainsRes.data
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching client:", err);
      setError("Failed to load client information");
    } finally {
      setLoading(false);
    }
  };

const fetchAllFiles = async () => {
  try {
    setLoadingFiles(true);
    
    const [taskFilesRes, profileFilesRes] = await Promise.all([
      API.get(`/users/files/client/${id}`).catch(() => ({ data: [] })),
      API.get(`/users/profile-files/client/${id}`).catch(() => ({ data: [] }))
    ]);
    
    const combinedFiles = [...profileFilesRes.data, ...taskFilesRes.data];
    
    setAllFiles(combinedFiles);
  } catch (err) {
    console.error("Error fetching files:", err);
  } finally {
    setLoadingFiles(false);
  }
};

  const handleOpenFiles = () => {
    setShowFilesModal(true);
    if (allFiles.length === 0) {
      fetchAllFiles();
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

  const getDaysUntilExpiry = (expiryDate: string | undefined) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysRemaining: number | null) => {
    if (daysRemaining === null) return { color: "gray", text: "Not Set", bg: "bg-white/10", border: "border-white/20" };
    if (daysRemaining < 0) return { color: "red", text: "Expired", bg: "bg-red-500/20", border: "border-red-500/40" };
    if (daysRemaining <= 30) return { color: "red", text: "Expiring Soon", bg: "bg-red-500/20", border: "border-red-500/40" };
    if (daysRemaining <= 90) return { color: "amber", text: "Renewal Due", bg: "bg-amber-500/20", border: "border-amber-500/40" };
    return { color: "green", text: "Active", bg: "bg-green-500/20", border: "border-green-500/40" };
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-500/20 text-green-400 border border-green-500/40";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/40";
      case "PENDING_APPROVAL":
        return "bg-white/10 text-white/80 border border-white/20";
      case "PENDING":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/40";
      case "PAID":
        return "bg-green-500/20 text-green-400 border border-green-500/40";
      default:
        return "bg-white/10 text-white/80 border border-white/20";
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full animate-bounce bg-white/80" style={{ animationDelay: "0ms" }} />
            <div className="h-3 w-3 rounded-full animate-bounce bg-white/60" style={{ animationDelay: "0.1s" }} />
            <div className="h-3 w-3 rounded-full animate-bounce bg-white/40" style={{ animationDelay: "0.2s" }} />
          </div>
          <span className="text-lg font-medium text-white/80">Loading client information...</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-6">
          <p className="mb-2 text-lg font-semibold text-red-300">Error:</p>
          <p className="text-red-400">{error || "Client not found"}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-primary mt-4 px-4 py-2 text-sm rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const activeTasks = client.clientTasks.filter(t => t.status !== "COMPLETED");
  const completedTasks = client.clientTasks.filter(t => t.status === "COMPLETED");
  const pendingInvoices = client.invoices.filter(i => i.status === "PENDING");
  const paidInvoices = client.invoices.filter(i => i.status === "PAID");
  const totalRevenue = client.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const outstandingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const domains = client.domains || [];

  return (
    <div className="min-h-screen py-24 bg-app">
      <div className="mx-auto max-w-7xl px-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-ghost mb-6 flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header Card */}
        <div className="glass-card mb-8 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Client Info */}
            <div className="flex items-start gap-4">
              {client.logo ? (
                <img
                  src={`http://localhost:4001${client.logo}`}
                  alt={client.company || client.name}
                  className="h-20 w-20 rounded-xl border-2 border-white/10 object-cover"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-xl text-2xl font-bold text-white"
                  style={{ backgroundColor: client.colorHex || "#374151" }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white/95">{client.name}</h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      client.profileStatus === "COMPLETE"
                        ? "border-green-500/40 bg-green-500/20 text-green-400"
                        : "border-amber-500/40 bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {client.profileStatus === "COMPLETE" ? "✓ Complete Profile" : "⚠ Incomplete Profile"}
                  </span>
                </div>
                
                {client.company && (
                  <p className="mb-1 text-lg font-medium text-white/80">{client.company}</p>
                )}
                
                {client.shortInfo && (
                  <p className="mb-3 text-sm text-white/60">{client.shortInfo}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{client.email}</span>
                  </div>
                  
                  {client.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{client.phoneNumber}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Client since {formatDate(client.createdAt)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenFiles}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    View All Files
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/tasks")}
                className="btn-primary px-4 py-2 text-sm rounded-lg"
              >
                Create New Task
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/invoices")}
                className="btn-secondary px-4 py-2 text-sm rounded-lg"
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">Active Tasks</p>
              <div className="rounded-lg bg-blue-500/20 p-2">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400">{activeTasks.length}</p>
          </div>

          <div className="glass-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">Completed Tasks</p>
              <div className="rounded-lg bg-green-500/20 p-2">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400">{completedTasks.length}</p>
          </div>

          <div className="glass-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">Total Revenue</p>
              <div className="rounded-lg bg-white/10 p-2">
                <svg className="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white/95">{formatCurrency(totalRevenue)}</p>
          </div>

          <div className="glass-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">Outstanding</p>
              <div className="rounded-lg bg-amber-500/20 p-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400">{formatCurrency(outstandingAmount)}</p>
            <p className="mt-1 text-xs text-white/50">{pendingInvoices.length} pending invoices</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex w-fit gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            {(["overview", "tasks", "invoices", "hosting"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-white/12 text-white border border-white/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white/90"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="glass-card p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold text-white/95">Client Information</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {client.address && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white/60">Address</p>
                      <p className="text-white/90">{client.address}</p>
                    </div>
                  )}
                  
                  {client.postalAddress && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white/60">Postal Address</p>
                      <p className="text-white/90">{client.postalAddress}</p>
                    </div>
                  )}
                  
                  {client.extraEmails && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white/50">Additional Emails</p>
                      <p className="text-white/95">{client.extraEmails}</p>
                    </div>
                  )}
                  
                  {client.brandPattern && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white/50">Brand Pattern</p>
                      <p className="text-white/95">{client.brandPattern}</p>
                    </div>
                  )}
                  
                  {client.colorHex && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-white/50">Brand Color</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-lg border-2 border-white/20"
                          style={{ backgroundColor: client.colorHex }}
                        ></div>
                        <span className="text-white/95">{client.colorHex}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="mb-4 text-xl font-bold text-white/95">Recent Activity</h3>
                <div className="space-y-3">
                  {[...client.clientTasks, ...client.invoices]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((item) => {
                      const isTask = 'title' in item;
                      return (
                        <div
                          key={`${isTask ? 'task' : 'invoice'}-${item.id}`}
                          className="flex items-center justify-between p-4 cursor-pointer rounded-xl border border-white/10 hover:bg-white/10"
                          onClick={() => navigate(isTask ? `/tasks/${item.id}` : `/dashboard`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isTask ? 'bg-blue-50' : 'bg-green-50'}`}>
                              <svg
                                className={`w-5 h-5 ${isTask ? 'text-blue-600' : 'text-green-600'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                {isTask ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                )}
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-white/95">
                                {isTask ? (item as Task).title : `Invoice #${(item as Invoice).invoiceNumber}`}
                              </p>
                              <p className="text-sm text-white/50">{formatDate(item.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-white/95">All Tasks</h2>
              
              {/* Active Tasks */}
              <div className="mb-8">
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Active Tasks ({activeTasks.length})</h3>
                {activeTasks.length > 0 ? (
                  <div className="space-y-3">
                    {activeTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 cursor-pointer rounded-xl border border-white/10 hover:bg-white/10"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-white/95">{task.title}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          {task.description && (
                            <p className="mb-1 text-sm text-white/60">{task.description}</p>
                          )}
                          <p className="text-xs text-white/50">
                            Worker: {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"} • Due: {task.dueDate ? formatDate(task.dueDate) : "No deadline"}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-white/50 bg-white/5 rounded-xl">No active tasks</p>
                )}
              </div>

              {/* Completed Tasks */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Completed Tasks ({completedTasks.length})</h3>
                {completedTasks.length > 0 ? (
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 cursor-pointer rounded-xl border border-white/10 hover:bg-white/10"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-white/95">{task.title}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-white/50">
                            Worker: {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"} • Completed: {formatDate(task.createdAt)}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-white/50 bg-white/5 rounded-xl">No completed tasks</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "invoices" && (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-white/95">All Invoices</h2>
              
              {/* Pending Invoices */}
              <div className="mb-8">
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Pending Invoices ({pendingInvoices.length})</h3>
                {pendingInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {pendingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 cursor-pointer rounded-xl border border-white/10 hover:bg-white/10"
                        onClick={() => navigate("/admin/invoices")}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-white/95">Invoice #{invoice.invoiceNumber}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-white/60">{formatCurrency(invoice.amount)} • Due: {formatDate(invoice.dueDate)}</p>
                        </div>
                        {invoice.paymentLink && (
                          <a
                            href={invoice.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-primary px-4 py-2 text-sm font-semibold"
                          >
                            Pay Now
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-white/50 bg-white/5 rounded-xl">No pending invoices</p>
                )}
              </div>

              {/* Paid Invoices */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Paid Invoices ({paidInvoices.length})</h3>
                {paidInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {paidInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 cursor-pointer rounded-xl border border-white/10 hover:bg-white/10"
                        onClick={() => navigate("/admin/invoices")}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-white/95">Invoice #{invoice.invoiceNumber}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-white/60">
                            {formatCurrency(invoice.amount)} • Paid: {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.createdAt)}
                          </p>
                        </div>
                        {invoice.fileUrl && (
                          <a
                            href={`http://localhost:4001${invoice.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-secondary px-4 py-2 text-sm rounded-lg"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-white/50 bg-white/5 rounded-xl">No paid invoices</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white/95">Domains & Hosting</h2>
                <p className="text-sm text-white/60">All domains and hosting information for this client</p>
              </div>

              {domains.length === 0 ? (
                <div className="py-12 text-center bg-white/5 rounded-2xl">
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-white/10 p-4">
                      <svg className="h-12 w-12 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-white/90">No domain information</p>
                  <p className="text-sm text-white/50">Contact your administrator for domain information</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {domains.map((domain) => {
                    const domainDays = domain.domainExpiry ? getDaysUntilExpiry(domain.domainExpiry) : null;
                    const hostingDays = domain.hostingExpiry ? getDaysUntilExpiry(domain.hostingExpiry) : null;
                    const sslDays = domain.sslExpiry ? getDaysUntilExpiry(domain.sslExpiry) : null;

                    return (
                      <div
                        key={domain.id}
                        className={`p-6 border-2 rounded-2xl ${
                          domain.isPrimary ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5"
                        }`}
                      >
                        {/* Domain Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-white/10 p-3">
                              <svg className="h-6 w-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <div>
                              <a 
                                href={`https://${domain.domainName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xl font-bold text-white/90 transition-colors hover:opacity-80"
                              >
                                {domain.domainName}
                              </a>
                              {domain.domainRegistrar && (
                                <p className="text-sm text-white/60">Registrar: {domain.domainRegistrar}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {domain.isPrimary && (
                              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white/95">
                                PRIMARY
                              </span>
                            )}
                            {!domain.isActive && (
                              <span className="px-3 py-1 text-xs font-bold text-white bg-gray-500 rounded-full">
                                INACTIVE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expiry Cards */}
                        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
                          {/* Domain Expiry */}
                          <div className={`p-4 border-2 rounded-xl ${getExpiryStatus(domainDays).bg} ${getExpiryStatus(domainDays).border}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`p-2 rounded-lg ${getExpiryStatus(domainDays).color === 'red' ? 'bg-red-100' : getExpiryStatus(domainDays).color === 'amber' ? 'bg-amber-100' : getExpiryStatus(domainDays).color === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-600' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white/50 uppercase">Domain</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-700' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(domainDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {domainDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-600' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`}>
                                  {domainDays < 0 ? 0 : domainDays}
                                </p>
                                <p className="mb-2 text-xs text-white/60">days remaining</p>
                                <p className="text-xs text-white/50">
                                  {domain.domainExpiry ? formatDate(domain.domainExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-white/50">No expiry date set</p>
                            )}
                          </div>

                          {/* Hosting Expiry */}
                          <div className={`p-4 border-2 rounded-xl ${getExpiryStatus(hostingDays).bg} ${getExpiryStatus(hostingDays).border}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`p-2 rounded-lg ${getExpiryStatus(hostingDays).color === 'red' ? 'bg-red-100' : getExpiryStatus(hostingDays).color === 'amber' ? 'bg-amber-100' : getExpiryStatus(hostingDays).color === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-600' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white/50 uppercase">Hosting</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-700' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(hostingDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {hostingDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-600' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`}>
                                  {hostingDays < 0 ? 0 : hostingDays}
                                </p>
                                <p className="mb-2 text-xs text-white/60">days remaining</p>
                                <p className="text-xs text-white/50">
                                  {domain.hostingExpiry ? formatDate(domain.hostingExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-white/50">No expiry date set</p>
                            )}
                          </div>

                          {/* SSL Expiry */}
                          <div className={`p-4 border-2 rounded-xl ${getExpiryStatus(sslDays).bg} ${getExpiryStatus(sslDays).border}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`p-2 rounded-lg ${getExpiryStatus(sslDays).color === 'red' ? 'bg-red-100' : getExpiryStatus(sslDays).color === 'amber' ? 'bg-amber-100' : getExpiryStatus(sslDays).color === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-600' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white/50 uppercase">SSL</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-700' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(sslDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {sslDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-600' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-600' : 'text-white/60'}`}>
                                  {sslDays < 0 ? 0 : sslDays}
                                </p>
                                <p className="mb-2 text-xs text-white/60">days remaining</p>
                                <p className="text-xs text-white/50">
                                  {domain.sslExpiry ? formatDate(domain.sslExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-white/50">No expiry date set</p>
                            )}
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="glass-card p-4 rounded-xl">
                            <p className="mb-2 text-xs font-semibold text-white/50 uppercase">Hosting Provider</p>
                            <p className="text-sm font-medium text-white/95">
                              {domain.hostingProvider || 'Not specified'}
                            </p>
                          </div>
                          <div className="glass-card p-4 rounded-xl">
                            <p className="mb-2 text-xs font-semibold text-white/50 uppercase">Hosting Plan</p>
                            <p className="text-sm font-medium text-white/95">
                              {domain.hostingPlan || 'Not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        {domain.notes && (
                          <div className="p-4 mt-4 border border-gray-200 rounded-xl bg-amber-50">
                            <p className="mb-2 text-xs font-semibold text-gray-700 uppercase">Notes</p>
                            <p className="text-sm text-gray-700">{domain.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FILES MODAL */}
      <Modal
        isOpen={showFilesModal}
        onClose={() => setShowFilesModal(false)}
        maxWidth="4xl"
        title={
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>All Files</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90">
              {allFiles.length} {allFiles.length === 1 ? "file" : "files"}
            </span>
          </div>
        }
      >
        {loadingFiles ? (
          <div className="flex justify-center py-12">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full animate-bounce bg-white/80" style={{ animationDelay: "0ms" }} />
              <div className="h-3 w-3 rounded-full animate-bounce bg-white/60" style={{ animationDelay: "0.1s" }} />
              <div className="h-3 w-3 rounded-full animate-bounce bg-white/40" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        ) : allFiles.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium text-white/60">No files uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {allFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/15 hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-lg bg-white/10 p-3 text-white/80">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate text-sm font-semibold text-white/95">{file.fileName}</h3>
                    {file.caption && (
                      <p className="mb-2 line-clamp-2 text-xs text-white/60">{file.caption}</p>
                    )}
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded px-2 py-1 text-xs font-medium text-white/70 bg-white/10">
                        {file.task.title}
                      </span>
                      {file.section && (
                        <span className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-white/70">
                          {file.section}
                        </span>
                      )}
                      {file.isCompleted && (
                        <span className="rounded px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/20">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-white/50">Uploaded {formatDate(file.uploadedAt)}</p>
                    <a
                      href={`http://localhost:4001/${file.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View File
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientDetailPage;