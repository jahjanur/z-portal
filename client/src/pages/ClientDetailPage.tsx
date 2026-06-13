import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { getFileUrl } from "../api";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import Spinner from "../components/ui/Spinner";
import { SkeletonDashboard } from "../components/ui/Skeleton";

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

type ExpiryTone = "neutral" | "success" | "warning" | "danger";

const EXPIRY_STYLES: Record<ExpiryTone, { badge: string; panel: string; accent: string }> = {
  neutral: {
    badge: "badge",
    panel: "border-[var(--color-border)] bg-[var(--color-surface-2)]",
    accent: "text-[var(--color-text-muted)]",
  },
  success: {
    badge: "badge badge-success",
    panel: "border-[var(--color-success-border)] bg-[var(--color-success-bg)]",
    accent: "text-[var(--color-success-text)]",
  },
  warning: {
    badge: "badge badge-warning",
    panel: "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]",
    accent: "text-[var(--color-warning-text)]",
  },
  danger: {
    badge: "badge badge-danger",
    panel: "border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]",
    accent: "text-[var(--color-destructive-text)]",
  },
};

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "invoices" | "hosting">("overview");
  const isEraSphere = localStorage.getItem("role") === "ERASPHERE";
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const tasksPath = isAdmin ? "/admin/zulbera/tasks" : "/admin/tasks";
  const invoicesPath = isAdmin ? "/admin/zulbera/invoices" : "/admin/invoices";

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
        ...(isEraSphere ? [Promise.resolve({ data: [] as Domain[] })] : [API.get(`/domains/client/${id}`)]),
      ]);

      setClient({
        ...response.data,
        clientTasks: tasksRes.data,
        invoices: invoicesRes.data,
        domains: domainsRes?.data ?? [],
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
    fetchAllFiles();
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

  const getExpiryStatus = (daysRemaining: number | null): { tone: ExpiryTone; text: string } => {
    if (daysRemaining === null) return { tone: "neutral", text: "Not Set" };
    if (daysRemaining < 0) return { tone: "danger", text: "Expired" };
    if (daysRemaining <= 30) return { tone: "danger", text: "Expiring Soon" };
    if (daysRemaining <= 90) return { tone: "warning", text: "Renewal Due" };
    return { tone: "success", text: "Active" };
  };

  const renderExpiryCard = (
    label: string,
    icon: React.ReactNode,
    days: number | null,
    expiryDate?: string
  ) => {
    const status = getExpiryStatus(days);
    const styles = EXPIRY_STYLES[status.tone];
    return (
      <div className={`rounded-xl border p-4 ${styles.panel}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] ${styles.accent}`}>
              {icon}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
          </div>
          <span className={styles.badge}>{status.text}</span>
        </div>

        {days !== null ? (
          <>
            <p className={`mb-1 text-3xl font-bold tracking-tight ${styles.accent}`}>
              {days < 0 ? 0 : days}
            </p>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">days remaining</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {expiryDate ? formatDate(expiryDate) : "Not set"}
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No expiry date set</p>
        )}
      </div>
    );
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
      <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-app py-24">
        <div className="mx-auto max-w-7xl min-w-0 px-4">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6 shadow-elev-sm">
          <p className="mb-1 text-lg font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="text-sm text-[var(--color-destructive-text)] opacity-90">{error || "Client not found"}</p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={() => navigate(-1)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Go Back
          </Button>
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
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-app py-24">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6 px-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>

        {/* Header Card */}
        <div className="card-panel animate-fade-up p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Client Info */}
            <div className="flex min-w-0 items-start gap-4">
              {client.logo ? (
                <img
                  src={getFileUrl(client.logo)}
                  alt={client.company || client.name}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-[var(--color-border)]"
                />
              ) : (
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white ring-1 ring-[var(--color-border)]"
                  style={{ backgroundColor: client.colorHex || "var(--color-surface-3)" }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h1 className="page-title">{client.name}</h1>
                  <StatusBadge status={client.profileStatus === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}>
                    {client.profileStatus === "COMPLETE" ? "Complete Profile" : "Incomplete Profile"}
                  </StatusBadge>
                </div>

                {client.company && (
                  <p className="mb-1 text-lg font-medium text-[var(--color-text-secondary)]">{client.company}</p>
                )}

                {client.shortInfo && (
                  <p className="mb-3 text-sm text-[var(--color-text-muted)]">{client.shortInfo}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{client.email}</span>
                  </div>

                  {client.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{client.phoneNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Client since {formatDate(client.createdAt)}</span>
                  </div>

                  <Button variant="secondary" size="sm" onClick={handleOpenFiles}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    View All Files
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex shrink-0 flex-col gap-2">
              <Button variant="primary" size="md" onClick={() => navigate(tasksPath)}>
                Create New Task
              </Button>
              <Button variant="secondary" size="md" onClick={() => navigate(invoicesPath)}>
                Generate Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
          <StatCard
            label="Active Tasks"
            value={activeTasks.length}
            tone="info"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Completed Tasks"
            value={completedTasks.length}
            tone="success"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(totalRevenue)}
            tone="neutral"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstandingAmount)}
            tone="warning"
            hint={`${pendingInvoices.length} pending invoice${pendingInvoices.length === 1 ? "" : "s"}`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div className="flex w-fit gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
            {((isEraSphere
              ? (["overview", "tasks", "invoices"] as const)
              : (["overview", "tasks", "invoices", "hosting"] as const)) as ReadonlyArray<
              "overview" | "tasks" | "invoices" | "hosting"
            >).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] shadow-elev-sm"
                    : "text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="card-panel p-5 sm:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="section-title mb-4">Client Information</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {client.address && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">Address</p>
                      <p className="text-[var(--color-text-primary)]">{client.address}</p>
                    </div>
                  )}

                  {client.postalAddress && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">Postal Address</p>
                      <p className="text-[var(--color-text-primary)]">{client.postalAddress}</p>
                    </div>
                  )}

                  {client.extraEmails && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">Additional Emails</p>
                      <p className="text-[var(--color-text-primary)]">{client.extraEmails}</p>
                    </div>
                  )}

                  {client.brandPattern && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">Brand Pattern</p>
                      <p className="text-[var(--color-text-primary)]">{client.brandPattern}</p>
                    </div>
                  )}

                  {client.colorHex && (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">Brand Color</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-lg ring-1 ring-[var(--color-border)]"
                          style={{ backgroundColor: client.colorHex }}
                        ></div>
                        <span className="text-[var(--color-text-primary)]">{client.colorHex}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="section-title mb-4">Recent Activity</h3>
                <div className="space-y-3 stagger-children">
                  {[...client.clientTasks, ...client.invoices]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((item) => {
                      const isTask = 'title' in item;
                      return (
                        <div
                          key={`${isTask ? 'task' : 'invoice'}-${item.id}`}
                          className="row-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
                          onClick={() => navigate(isTask ? `/tasks/${item.id}` : `/dashboard`)}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`shrink-0 rounded-lg border p-2 ${
                                isTask
                                  ? "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]"
                                  : "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                              }`}
                            >
                              <svg
                                className="h-5 w-5"
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
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--color-text-primary)]">
                                {isTask ? (item as Task).title : `Invoice #${(item as Invoice).invoiceNumber}`}
                              </p>
                              <p className="text-sm text-[var(--color-text-muted)]">{formatDate(item.createdAt)}</p>
                            </div>
                          </div>
                          <StatusBadge status={item.status} className="shrink-0" />
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div>
              <h2 className="section-title mb-4">All Tasks</h2>

              {/* Active Tasks */}
              <div className="mb-8">
                <h3 className="mb-3 text-base font-semibold text-[var(--color-text-secondary)]">
                  Active Tasks ({activeTasks.length})
                </h3>
                {activeTasks.length > 0 ? (
                  <div className="space-y-3 stagger-children">
                    {activeTasks.map((task) => (
                      <div
                        key={task.id}
                        className="row-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--color-text-primary)]">{task.title}</p>
                            <StatusBadge status={task.status} />
                          </div>
                          {task.description && (
                            <p className="mb-1 text-sm text-[var(--color-text-secondary)]">{task.description}</p>
                          )}
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Worker: {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"} • Due: {task.dueDate ? formatDate(task.dueDate) : "No deadline"}
                          </p>
                        </div>
                        <svg className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No active tasks" />
                )}
              </div>

              {/* Completed Tasks */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-[var(--color-text-secondary)]">
                  Completed Tasks ({completedTasks.length})
                </h3>
                {completedTasks.length > 0 ? (
                  <div className="space-y-3 stagger-children">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="row-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--color-text-primary)]">{task.title}</p>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Worker: {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"} • Completed: {formatDate(task.createdAt)}
                          </p>
                        </div>
                        <svg className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No completed tasks" />
                )}
              </div>
            </div>
          )}

          {activeTab === "invoices" && (
            <div>
              <h2 className="section-title mb-4">All Invoices</h2>

              {/* Pending Invoices */}
              <div className="mb-8">
                <h3 className="mb-3 text-base font-semibold text-[var(--color-text-secondary)]">
                  Pending Invoices ({pendingInvoices.length})
                </h3>
                {pendingInvoices.length > 0 ? (
                  <div className="space-y-3 stagger-children">
                    {pendingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="row-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
                        onClick={() => navigate(invoicesPath)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--color-text-primary)]">Invoice #{invoice.invoiceNumber}</p>
                            <StatusBadge status={invoice.status} />
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {formatCurrency(invoice.amount)} • Due: {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        {invoice.paymentLink && (
                          <a
                            href={invoice.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-primary h-9 shrink-0 px-4 text-xs"
                          >
                            Pay Now
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No pending invoices" />
                )}
              </div>

              {/* Paid Invoices */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-[var(--color-text-secondary)]">
                  Paid Invoices ({paidInvoices.length})
                </h3>
                {paidInvoices.length > 0 ? (
                  <div className="space-y-3 stagger-children">
                    {paidInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="row-hover flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
                        onClick={() => navigate(invoicesPath)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--color-text-primary)]">Invoice #{invoice.invoiceNumber}</p>
                            <StatusBadge status={invoice.status} />
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {formatCurrency(invoice.amount)} • Paid: {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.createdAt)}
                          </p>
                        </div>
                        {invoice.fileUrl && (
                          <a
                            href={getFileUrl(invoice.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-secondary h-9 shrink-0 px-4 text-xs"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No paid invoices" />
                )}
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div>
              <div className="mb-6">
                <h2 className="section-title">Domains & Hosting</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  All domains and hosting information for this client
                </p>
              </div>

              {domains.length === 0 ? (
                <EmptyState
                  title="No domain information"
                  description="Contact your administrator for domain information"
                  icon={
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  }
                />
              ) : (
                <div className="space-y-6 stagger-children">
                  {domains.map((domain) => {
                    const domainDays = domain.domainExpiry ? getDaysUntilExpiry(domain.domainExpiry) : null;
                    const hostingDays = domain.hostingExpiry ? getDaysUntilExpiry(domain.hostingExpiry) : null;
                    const sslDays = domain.sslExpiry ? getDaysUntilExpiry(domain.sslExpiry) : null;

                    return (
                      <div
                        key={domain.id}
                        className={`rounded-2xl border p-5 sm:p-6 ${
                          domain.isPrimary
                            ? "border-[var(--color-border-hover)] bg-[var(--color-surface-2)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                        }`}
                      >
                        {/* Domain Header */}
                        <div className="mb-6 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-secondary)]">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <a
                                href={`https://${domain.domainName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-xl font-bold text-[var(--color-text-primary)] transition-colors hover:opacity-80"
                              >
                                {domain.domainName}
                              </a>
                              {domain.domainRegistrar && (
                                <p className="text-sm text-[var(--color-text-muted)]">Registrar: {domain.domainRegistrar}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {domain.isPrimary && (
                              <StatusBadge tone="info" dot={false} className="uppercase tracking-wide">
                                Primary
                              </StatusBadge>
                            )}
                            {!domain.isActive && (
                              <StatusBadge tone="neutral" dot={false} className="uppercase tracking-wide">
                                Inactive
                              </StatusBadge>
                            )}
                          </div>
                        </div>

                        {/* Expiry Cards */}
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                          {renderExpiryCard(
                            "Domain",
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>,
                            domainDays,
                            domain.domainExpiry
                          )}
                          {renderExpiryCard(
                            "Hosting",
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>,
                            hostingDays,
                            domain.hostingExpiry
                          )}
                          {renderExpiryCard(
                            "SSL",
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>,
                            sslDays,
                            domain.sslExpiry
                          )}
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hosting Provider</p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {domain.hostingProvider || 'Not specified'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Hosting Plan</p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {domain.hostingPlan || 'Not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        {domain.notes && (
                          <div className="mt-4 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-warning-text)]">Notes</p>
                            <p className="text-sm text-[var(--color-warning-text)]">{domain.notes}</p>
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
            <svg className="h-6 w-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>All Files</span>
            <StatusBadge tone="neutral" dot={false}>
              {allFiles.length} {allFiles.length === 1 ? "file" : "files"}
            </StatusBadge>
          </div>
        }
      >
        {loadingFiles ? (
          <Spinner page label="Loading files..." />
        ) : allFiles.length === 0 ? (
          <EmptyState
            title="No files uploaded yet"
            description="Files shared on this client's tasks and profile will appear here."
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 stagger-children">
            {allFiles.map((file) => (
              <div
                key={file.id}
                className="row-hover rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-secondary)]">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.fileName}</h3>
                    {file.caption && (
                      <p className="mb-2 line-clamp-2 text-xs text-[var(--color-text-muted)]">{file.caption}</p>
                    )}
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded bg-[var(--color-surface-3)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                        {file.task.title}
                      </span>
                      {file.section && (
                        <span className="rounded bg-[var(--color-surface-3)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                          {file.section}
                        </span>
                      )}
                      {file.isCompleted && (
                        <StatusBadge tone="success" dot={false}>
                          Completed
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-[var(--color-text-muted)]">Uploaded {formatDate(file.uploadedAt)}</p>
                    <a
                      href={getFileUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary h-9 px-3 text-xs"
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
