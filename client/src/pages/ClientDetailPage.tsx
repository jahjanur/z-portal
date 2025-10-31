import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
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
  worker?: {
    id: number;
    name: string;
    email: string;
  };
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
    if (daysRemaining === null) return { color: "gray", text: "Not Set", bg: "bg-gray-50", border: "border-gray-200" };
    if (daysRemaining < 0) return { color: "red", text: "Expired", bg: "bg-red-50", border: "border-red-200" };
    if (daysRemaining <= 30) return { color: "red", text: "Expiring Soon", bg: "bg-red-50", border: "border-red-200" };
    if (daysRemaining <= 90) return { color: "amber", text: "Renewal Due", bg: "bg-amber-50", border: "border-amber-200" };
    return { color: "green", text: "Active", bg: "bg-green-50", border: "border-green-200" };
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING_APPROVAL":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "PAID":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: "0.1s" }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: "0.2s" }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading client information...</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <p className="mb-2 text-lg font-semibold text-red-800">Error:</p>
          <p className="text-red-600">{error || "Client not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 mt-4 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: colors.primary }}
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
    <div className="min-h-screen py-24 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-gray-600 transition-colors hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header Card */}
        <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Client Info */}
            <div className="flex items-start gap-4">
              {/* Logo */}
              {client.logo ? (
                <img
                  src={`http://localhost:4000${client.logo}`}
                  alt={client.company || client.name}
                  className="object-cover w-20 h-20 border-2 border-gray-200 rounded-xl"
                />
              ) : (
                <div
                  className="flex items-center justify-center w-20 h-20 text-2xl font-bold text-white rounded-xl"
                  style={{ backgroundColor: client.colorHex || colors.primary }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      client.profileStatus === "COMPLETE"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {client.profileStatus === "COMPLETE" ? "✓ Complete Profile" : "⚠ Incomplete Profile"}
                  </span>
                </div>
                
                {client.company && (
                  <p className="mb-1 text-lg font-medium text-gray-700">{client.company}</p>
                )}
                
                {client.shortInfo && (
                  <p className="mb-3 text-sm text-gray-600">{client.shortInfo}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                    onClick={handleOpenFiles}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg hover:opacity-90"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                onClick={() => navigate("/dashboard", { state: { activeTab: "tasks" } })}
                className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                Create New Task
              </button>
              <button
                onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                className="px-4 py-2 text-sm font-semibold transition-all bg-white border-2 rounded-lg hover:bg-gray-50"
                style={{ color: colors.primary, borderColor: colors.primary }}
              >
                Generate Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Active Tasks</p>
              <div className="p-2 rounded-lg bg-blue-50">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">{activeTasks.length}</p>
          </div>

          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Completed Tasks</p>
              <div className="p-2 rounded-lg bg-green-50">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
          </div>

          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>{formatCurrency(totalRevenue)}</p>
          </div>

          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Outstanding</p>
              <div className="p-2 rounded-lg bg-amber-50">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(outstandingAmount)}</p>
            <p className="mt-1 text-xs text-gray-500">{pendingInvoices.length} pending invoices</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-xl w-fit">
            {(["overview", "tasks", "invoices", "hosting"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? "text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                style={activeTab === tab ? { backgroundColor: colors.primary } : {}}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Client Information</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {client.address && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-500">Address</p>
                      <p className="text-gray-900">{client.address}</p>
                    </div>
                  )}
                  
                  {client.postalAddress && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-500">Postal Address</p>
                      <p className="text-gray-900">{client.postalAddress}</p>
                    </div>
                  )}
                  
                  {client.extraEmails && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-500">Additional Emails</p>
                      <p className="text-gray-900">{client.extraEmails}</p>
                    </div>
                  )}
                  
                  {client.brandPattern && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-500">Brand Pattern</p>
                      <p className="text-gray-900">{client.brandPattern}</p>
                    </div>
                  )}
                  
                  {client.colorHex && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-500">Brand Color</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 border-2 border-gray-200 rounded-lg"
                          style={{ backgroundColor: client.colorHex }}
                        ></div>
                        <span className="text-gray-900">{client.colorHex}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="mb-4 text-xl font-bold text-gray-900">Recent Activity</h3>
                <div className="space-y-3">
                  {[...client.clientTasks, ...client.invoices]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((item) => {
                      const isTask = 'title' in item;
                      return (
                        <div
                          key={`${isTask ? 'task' : 'invoice'}-${item.id}`}
                          className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50"
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
                              <p className="font-semibold text-gray-900">
                                {isTask ? (item as Task).title : `Invoice #${(item as Invoice).invoiceNumber}`}
                              </p>
                              <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
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
              <h2 className="mb-4 text-2xl font-bold text-gray-900">All Tasks</h2>
              
              {/* Active Tasks */}
              <div className="mb-8">
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Active Tasks ({activeTasks.length})</h3>
                {activeTasks.length > 0 ? (
                  <div className="space-y-3">
                    {activeTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          {task.description && (
                            <p className="mb-1 text-sm text-gray-600">{task.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Worker: {task.worker?.name || "Unassigned"} • Due: {task.dueDate ? formatDate(task.dueDate) : "No deadline"}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl">No active tasks</p>
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
                        className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Worker: {task.worker?.name || "Unassigned"} • Completed: {formatDate(task.createdAt)}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl">No completed tasks</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "invoices" && (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">All Invoices</h2>
              
              {/* Pending Invoices */}
              <div className="mb-8">
                <h3 className="mb-3 text-lg font-semibold text-gray-700">Pending Invoices ({pendingInvoices.length})</h3>
                {pendingInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {pendingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50"
                        onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{formatCurrency(invoice.amount)} • Due: {formatDate(invoice.dueDate)}</p>
                        </div>
                        {invoice.paymentLink && (
                          <a
                            href={invoice.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
                            style={{ backgroundColor: colors.primary }}
                          >
                            Pay Now
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl">No pending invoices</p>
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
                        className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50"
                        onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</p>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(invoice.amount)} • Paid: {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.createdAt)}
                          </p>
                        </div>
                        {invoice.fileUrl && (
                          <a
                            href={`http://localhost:4000${invoice.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 text-sm font-semibold transition-all bg-white border-2 rounded-lg hover:bg-gray-50"
                            style={{ color: colors.primary, borderColor: colors.primary }}
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl">No paid invoices</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Domains & Hosting</h2>
                <p className="text-sm text-gray-600">All domains and hosting information for this client</p>
              </div>

              {domains.length === 0 ? (
                <div className="py-12 text-center bg-gray-50 rounded-2xl">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">No domain information</p>
                  <p className="text-sm text-gray-500">Contact your administrator for domain information</p>
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
                          domain.isPrimary ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        {/* Domain Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}15` }}>
                              <svg className="w-6 h-6" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <div>
                              <a 
                                href={`https://${domain.domainName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xl font-bold transition-colors hover:opacity-80"
                                style={{ color: colors.primary }}
                              >
                                {domain.domainName}
                              </a>
                              {domain.domainRegistrar && (
                                <p className="text-sm text-gray-600">Registrar: {domain.domainRegistrar}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {domain.isPrimary && (
                              <span className="px-3 py-1 text-xs font-bold text-white bg-purple-600 rounded-full">
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
                                <svg className={`w-4 h-4 ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-600' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Domain</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-700' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(domainDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {domainDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(domainDays).color === 'red' ? 'text-red-600' : getExpiryStatus(domainDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(domainDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`}>
                                  {domainDays < 0 ? 0 : domainDays}
                                </p>
                                <p className="mb-2 text-xs text-gray-600">days remaining</p>
                                <p className="text-xs text-gray-500">
                                  {domain.domainExpiry ? formatDate(domain.domainExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No expiry date set</p>
                            )}
                          </div>

                          {/* Hosting Expiry */}
                          <div className={`p-4 border-2 rounded-xl ${getExpiryStatus(hostingDays).bg} ${getExpiryStatus(hostingDays).border}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`p-2 rounded-lg ${getExpiryStatus(hostingDays).color === 'red' ? 'bg-red-100' : getExpiryStatus(hostingDays).color === 'amber' ? 'bg-amber-100' : getExpiryStatus(hostingDays).color === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-600' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Hosting</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-700' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(hostingDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {hostingDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(hostingDays).color === 'red' ? 'text-red-600' : getExpiryStatus(hostingDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(hostingDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`}>
                                  {hostingDays < 0 ? 0 : hostingDays}
                                </p>
                                <p className="mb-2 text-xs text-gray-600">days remaining</p>
                                <p className="text-xs text-gray-500">
                                  {domain.hostingExpiry ? formatDate(domain.hostingExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No expiry date set</p>
                            )}
                          </div>

                          {/* SSL Expiry */}
                          <div className={`p-4 border-2 rounded-xl ${getExpiryStatus(sslDays).bg} ${getExpiryStatus(sslDays).border}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`p-2 rounded-lg ${getExpiryStatus(sslDays).color === 'red' ? 'bg-red-100' : getExpiryStatus(sslDays).color === 'amber' ? 'bg-amber-100' : getExpiryStatus(sslDays).color === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <svg className={`w-4 h-4 ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-600' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">SSL</p>
                                <p className={`text-xs font-semibold ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-700' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-700' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
                                  {getExpiryStatus(sslDays).text}
                                </p>
                              </div>
                            </div>
                            
                            {sslDays !== null ? (
                              <>
                                <p className={`text-3xl font-bold mb-1 ${getExpiryStatus(sslDays).color === 'red' ? 'text-red-600' : getExpiryStatus(sslDays).color === 'amber' ? 'text-amber-600' : getExpiryStatus(sslDays).color === 'green' ? 'text-green-600' : 'text-gray-600'}`}>
                                  {sslDays < 0 ? 0 : sslDays}
                                </p>
                                <p className="mb-2 text-xs text-gray-600">days remaining</p>
                                <p className="text-xs text-gray-500">
                                  {domain.sslExpiry ? formatDate(domain.sslExpiry) : 'Not set'}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No expiry date set</p>
                            )}
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="p-4 bg-white border border-gray-200 rounded-xl">
                            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Hosting Provider</p>
                            <p className="text-sm font-medium text-gray-900">
                              {domain.hostingProvider || 'Not specified'}
                            </p>
                          </div>
                          <div className="p-4 bg-white border border-gray-200 rounded-xl">
                            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Hosting Plan</p>
                            <p className="text-sm font-medium text-gray-900">
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
      {showFilesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowFilesModal(false)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h2 className="text-2xl font-bold text-white">All Files</h2>
                <span className="px-3 py-1 text-sm font-semibold bg-white rounded-full text-blakc bg-opacity-20">
                  {allFiles.length} {allFiles.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <button
                onClick={() => setShowFilesModal(false)}
                className="p-2 text-white transition-colors rounded-lg hover:bg-white hover:bg-opacity-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
                    <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: "0.1s" }}></div>
                    <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              ) : allFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {allFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 transition-all border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
                          <div style={{ color: colors.primary }}>
                            {getFileIcon(file.fileType)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-1 text-sm font-semibold text-gray-900 truncate">
                            {file.fileName}
                          </h3>
                          
                          {file.caption && (
                            <p className="mb-2 text-xs text-gray-600 line-clamp-2">{file.caption}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                              {file.task.title}
                            </span>
                            
                            {file.section && (
                              <span className="px-2 py-1 text-xs font-medium rounded" style={{ 
                                backgroundColor: `${colors.secondary}20`,
                                color: colors.secondary 
                              }}>
                                {file.section}
                              </span>
                            )}
                            
                            {file.isCompleted && (
                              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                                ✓ Completed
                              </span>
                            )}
                          </div>
                          
                          <p className="mb-3 text-xs text-gray-500">
                            Uploaded {formatDate(file.uploadedAt)}
                          </p>
                          
                          <a
                            href={`http://localhost:4000/${file.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white transition-colors rounded-lg"
                            style={{ backgroundColor: colors.primary }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailPage;