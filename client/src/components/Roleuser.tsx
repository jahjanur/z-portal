import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../api";
import ProgressBar from "./user/ProgressBar";
import RecentProjectCard from "./user/RecentProjectCard";
import RecentInvoiceCard from "./user/RecentInvoiceCard";
import ProjectCard from "./user/ProjectCard";
import InvoiceCard from "./user/InvoiceCard";
import FileCard from "./user/FileCard";
import FilesBySection from "./user/FilesSection";
import Pagination from "./ui/Pagination";
import PageHeader from "./ui/PageHeader";
import StatCard from "./ui/StatCard";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";
import SectionCard from "./ui/SectionCard";
import { SkeletonDashboard } from "./ui/Skeleton";
import { useNotifications } from "../hooks/useNotifications";
import { getStatusColor, formatDate, formatCurrency, getDaysUntilDue, isInvoiceOverdue, invoiceRemaining, invoicePaid } from "../utils";
import { formatMoney } from "../utils/currency";
import { getFileUrl } from "../api";
import { createPortal } from "react-dom";
import Modal from "./ui/Modal";
import StatusBadge from "./ui/StatusBadge";
import ClientCollaborators from "./user/ClientCollaborators";

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
  workers?: { user: Worker }[];
  files?: TaskFile[];
  milestones?: { id: number; isDone: boolean }[];
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
  currency?: string | null;
  dueDate?: string | null;
  status?: string | null;
  invoiceNumber: string;
  description?: string | null;
  paidAt?: string | null;
  amountPaid?: number;
  remaining?: number;
  issueDate?: string | null;
  paymentLink?: string | null;
  payments?: { id: number; amount: number; paidAt: string; note?: string | null; receiptUrl?: string | null }[];
}

interface Domain {
  id: number;
  domainName: string;
  expirationDate?: string | null;
  hostingPlan?: string | null;
  hostingExpiry?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

interface Server {
  id: number;
  label: string;
  provider?: string | null;
  plan?: string | null;
  location?: string | null;
  expirationDate?: string | null;
  price?: number | null;
  currency?: string | null;
  billingCycle?: string | null;
  status?: string | null;
  notes?: string | null;
}

const PAGE_SIZE = 10;

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Projects" },
  { key: "invoices", label: "Invoices" },
  { key: "files", label: "Files" },
  { key: "domains", label: "Domains" },
  { key: "servers", label: "Servers" },
  { key: "team", label: "Team" },
] as const;

const RoleUser: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, fetchNotifications } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: "overview" | "tasks" | "invoices" | "files" | "domains" | "servers" | "team" =
    (["overview", "tasks", "invoices", "files", "domains", "servers", "team"] as const).includes(tabParam as any)
      ? (tabParam as "overview" | "tasks" | "invoices" | "files" | "domains" | "servers" | "team")
      : "overview";
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|svg)$/i.test(url.split("?")[0]);
  const isPdfUrl = (url: string) => /\.pdf$/i.test(url.split("?")[0]);

  useEffect(() => {
    fetchAll();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === "files") {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

const fetchAll = async () => {
  setLoading(true);
  setError(null);
  try {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      throw new Error("User ID not found. Please login again.");
    }

    const [tasksRes, invoicesRes, domainsRes, serversRes] = await Promise.all([
      API.get<Task[]>("/tasks"),
      API.get<Invoice[]>("/invoices"),
      API.get<Domain[]>(`/domains/client/${userId}`),
      API.get<Server[]>(`/servers/client/${userId}`).catch(() => ({ data: [] as Server[] })),
    ]);

    setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
    setDomains(Array.isArray(domainsRes.data) ? domainsRes.data : []);
    setServers(Array.isArray(serversRes.data) ? serversRes.data : []);
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

  // Pending and Overdue are mutually exclusive so the summary never counts the
  // same invoice twice (isInvoiceOverdue also catches admin-flagged OVERDUE).
  const paidInvoices = invoices.filter(i => i.status?.toUpperCase() === "PAID");
  const overdueInvoices = invoices.filter(isInvoiceOverdue);
  // Partial-payment aware: totalPaid counts every recorded payment (even on
  // invoices that aren't fully settled yet), totalPending is what's still owed.
  const totalPaid = invoices.reduce((sum, inv) => sum + invoicePaid(inv), 0);
  const totalPending = invoices.reduce((sum, inv) => sum + invoiceRemaining(inv), 0);
  const invoiceCurrencies = Array.from(new Set(invoices.map((i) => i.currency || "USD")));
  const clientCurrency = invoiceCurrencies.length === 1 ? invoiceCurrencies[0] : undefined;
  const cmoney = (n: number) => formatMoney(n, clientCurrency);

  // Outstanding = every unpaid invoice with a remaining balance (partial aware).
  const outstandingInvoices = invoices
    .filter((i) => i.status?.toUpperCase() !== "PAID" && invoiceRemaining(i) > 0)
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
  const outstandingCurrencies = Array.from(new Set(outstandingInvoices.map((i) => i.currency || "USD")));
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + invoiceRemaining(i), 0);
  const singleCurrency = outstandingCurrencies.length === 1 ? outstandingCurrencies[0] : null;

  // Greet the client once per session with a summary of what's due.
  useEffect(() => {
    if (loading) return;
    const key = `pendingSeen:${localStorage.getItem("userId")}`;
    if (outstandingInvoices.length > 0 && !sessionStorage.getItem(key)) {
      setShowPendingModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const dismissPendingModal = () => {
    setShowPendingModal(false);
    sessionStorage.setItem(`pendingSeen:${localStorage.getItem("userId")}`, "1");
  };

  const viewPendingInvoices = () => {
    dismissPendingModal();
    setSearchParams({ tab: "invoices" });
  };
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

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

  const taskTotalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginatedTasks = filteredTasks.slice((taskPage - 1) * PAGE_SIZE, taskPage * PAGE_SIZE);

  const filteredInvoices = invoices.filter(invoice => {
    let matchesStatus = false;
    if (statusFilter === "ALL") {
      matchesStatus = true;
    } else if (statusFilter === "OVERDUE") {
      matchesStatus = isInvoiceOverdue(invoice);
    } else {
      matchesStatus = invoice.status?.toUpperCase() === statusFilter;
    }
    const matchesSearch = invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const invoiceTotalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * PAGE_SIZE, invoicePage * PAGE_SIZE);

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

  /** Semantic badge for a domain/hosting expiry date */
  const expiryBadge = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    if (isDomainExpired(expiryDate)) {
      return <span className="badge badge-danger">Expired</span>;
    }
    if (isDomainExpiringSoon(expiryDate)) {
      return <span className="badge badge-warning">Expiring soon</span>;
    }
    return <span className="badge badge-success">Active</span>;
  };

  const firstName = (localStorage.getItem("name") || "").trim().split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md animate-fade-up pt-10">
        <div className="rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-5 text-center sm:p-6">
          <p className="text-base font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={fetchAll}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        subtitle="Track your projects, invoices, files, and domains."
      >
        {/* Tab pills — segmented control */}
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 shadow-elev-sm">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSearchParams({ tab: key })}
                aria-current={activeTab === key ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === key
                    ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
            <StatCard
              label="Total Projects"
              value={tasks.length}
              hint={`${completionRate}% completed`}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <StatCard
              label="In Progress"
              value={inProgressTasks}
              hint="Active projects"
              tone="info"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Total Invoiced"
              value={cmoney(totalInvoiced)}
              hint={`${invoices.length} invoices`}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Active Domains"
              value={activeDomains.length}
              hint={`${domains.length} total`}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              }
            />
          </div>

          {/* Invoice Summary + Notifications Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Invoice Summary */}
            <SectionCard title="Invoice Summary" bodyClassName="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3">
                <span className="badge badge-success">Paid</span>
                <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  {cmoney(totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3">
                <span className="badge badge-warning">Pending</span>
                <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  {cmoney(totalPending)}
                </span>
              </div>
              {overdueInvoices.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-3">
                  <span className="badge badge-danger">Overdue ({overdueInvoices.length})</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-destructive-text)]">
                    {cmoney(totalOverdue)}
                  </span>
                </div>
              )}
            </SectionCard>

            {/* Recent Notifications */}
            <SectionCard
              title="Recent Notifications"
              bodyClassName="space-y-2"
              headerRight={unreadCount > 0 ? <span className="badge badge-danger">{unreadCount} unread</span> : undefined}
            >
              {notifications.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No notifications yet</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { if (!n.read) markRead(n.id); }}
                    className={`row-hover flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left ${
                      !n.read ? "bg-[var(--color-surface-2)]" : ""
                    }`}
                  >
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-info-text)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.read ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{n.message}</p>
                    </div>
                  </button>
                ))
              )}
            </SectionCard>
          </div>

          {/* Progress Chart */}
          <SectionCard title="Project Progress" bodyClassName="space-y-4">
            <ProgressBar label="Completed" current={completedTasks} total={tasks.length} />
            <ProgressBar label="In Progress" current={inProgressTasks} total={tasks.length} />
            <ProgressBar label="Pending" current={pendingTasks} total={tasks.length} />
          </SectionCard>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Recent Projects"
              bodyClassName="space-y-3"
              footer={
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setSearchParams({ tab: "tasks" })}
                >
                  View All Projects
                </Button>
              }
            >
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No projects yet</p>
              ) : (
                tasks.slice(0, 3).map((task) => (
                  <RecentProjectCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    getStatusColor={getStatusColor}
                  />
                ))
              )}
            </SectionCard>

            <SectionCard
              title="Recent Invoices"
              bodyClassName="space-y-3"
              footer={
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setSearchParams({ tab: "invoices" })}
                >
                  View All Invoices
                </Button>
              }
            >
              {invoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No invoices yet</p>
              ) : (
                invoices.slice(0, 3).map((invoice) => (
                  <RecentInvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    getStatusColor={getStatusColor}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    primaryColor="var(--color-text-primary)"
                  />
                ))
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setTaskPage(1); }}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === status
                      ? "border-[var(--color-tab-active-border)] bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setTaskPage(1); }}
              className="input-dark w-full rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] md:w-64"
            />
          </div>

          {/* Tasks List */}
          <div className="space-y-4 stagger-children">
            {filteredTasks.length === 0 ? (
              <EmptyState
                title="No projects found"
                description="Try adjusting your filters"
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
            ) : (
              paginatedTasks.map((task) => (
                <ProjectCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                  getDaysUntilDue={getDaysUntilDue}
                  primaryColor="var(--color-text-primary)"
                />
              ))
            )}
          </div>
          <Pagination currentPage={taskPage} totalPages={taskTotalPages} onPageChange={setTaskPage} />
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {["ALL", "PENDING", "PAID", "OVERDUE"].map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setInvoicePage(1); }}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === status
                      ? "border-[var(--color-tab-active-border)] bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)] hover:text-[var(--color-tab-inactive-hover-text)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setInvoicePage(1); }}
              className="input-dark w-full rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] md:w-64"
            />
          </div>

          {/* Invoices List */}
          <div className="space-y-4 stagger-children">
            {filteredInvoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description="Try adjusting your filters"
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            ) : (
              paginatedInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => setInvoiceDetail(invoice)}
                  className="block w-full rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                >
                  <InvoiceCard
                    invoice={invoice}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                    getDaysUntilDue={getDaysUntilDue}
                    primaryColor="var(--color-text-primary)"
                  />
                </button>
              ))
            )}
          </div>
          <Pagination currentPage={invoicePage} totalPages={invoiceTotalPages} onPageChange={setInvoicePage} />

          {/* Invoice Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
            <StatCard
              label="Total Paid"
              value={cmoney(totalPaid)}
              hint={`${paidInvoices.length} fully paid · includes part-payments`}
              tone="success"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <StatCard
              label="Outstanding"
              value={cmoney(totalPending)}
              hint={`${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? "" : "s"} owing`}
              tone="warning"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === "files" && (
        <div className="space-y-6">
          {allFiles.length === 0 ? (
            <EmptyState
              title="No files uploaded yet"
              description="Files will appear here once uploaded to your projects"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
          ) : (
            <>
              <SectionCard
                title="All Project Files"
                headerRight={<span className="badge">{allFiles.length} files</span>}
                bodyClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children"
              >
                {allFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    formatDate={formatDate}
                    primaryColor="var(--color-text-primary)"
                  />
                ))}
              </SectionCard>

              {/* Files by Section */}
              <FilesBySection files={allFiles} primaryColor="var(--color-text-primary)" />
            </>
          )}
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
              className="input-dark w-full rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] sm:w-64"
            />
          </div>

          {/* Primary Domain Card */}
          {primaryDomain && (
            <div className="card-panel border-[var(--color-border-hover)] p-5 shadow-elev-md sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Primary Domain
                  </p>
                  <a
                    href={`https://${primaryDomain.domainName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all text-xl font-bold tracking-tight text-[var(--color-text-primary)] transition-opacity hover:opacity-80 sm:text-2xl"
                  >
                    {primaryDomain.domainName}
                  </a>
                </div>
                <span className="badge shrink-0 self-start">PRIMARY</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {primaryDomain.hostingPlan && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span><strong>Plan:</strong> {primaryDomain.hostingPlan}</span>
                  </div>
                )}
                {primaryDomain.expirationDate && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span><strong>Domain expires:</strong> {formatDate(primaryDomain.expirationDate)}</span>
                    {expiryBadge(primaryDomain.expirationDate)}
                  </div>
                )}
                {primaryDomain.hostingExpiry && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span><strong>Hosting expires:</strong> {formatDate(primaryDomain.hostingExpiry)}</span>
                    {expiryBadge(primaryDomain.hostingExpiry)}
                  </div>
                )}
              </div>
              {primaryDomain.notes && (
                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                  <p className="text-sm text-[var(--color-text-secondary)]"><strong>Notes:</strong> {primaryDomain.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Domains List */}
          {filteredDomains.length === 0 ? (
            <EmptyState
              title="No domains found"
              description="Contact your administrator to add domains"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              }
            />
          ) : (
            <SectionCard
              title="All Domains"
              headerRight={<span className="badge">{filteredDomains.length} domains</span>}
              bodyClassName="space-y-4 stagger-children"
            >
              {filteredDomains.map((domain) => (
                  <div
                    key={domain.id}
                    className={`card-panel card-panel-hover p-5 ${
                      domain.isPrimary ? "border-[var(--color-border-hover)]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                          <a
                            href={`https://${domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-lg font-bold tracking-tight text-[var(--color-text-primary)] transition-opacity hover:opacity-80"
                          >
                            {domain.domainName}
                          </a>
                          {domain.isPrimary && <span className="badge">PRIMARY</span>}
                          {!domain.isActive && <span className="badge badge-danger">INACTIVE</span>}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {domain.hostingPlan && (
                            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                              <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                              </svg>
                              <span>{domain.hostingPlan}</span>
                            </div>
                          )}

                          {domain.expirationDate && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                              <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Domain: {formatDate(domain.expirationDate)}</span>
                              {expiryBadge(domain.expirationDate)}
                            </div>
                          )}

                          {domain.hostingExpiry && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                              <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Hosting: {formatDate(domain.hostingExpiry)}</span>
                              {expiryBadge(domain.hostingExpiry)}
                            </div>
                          )}
                        </div>

                        {domain.notes && (
                          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                            <p className="text-sm text-[var(--color-text-secondary)]">{domain.notes}</p>
                          </div>
                        )}
                      </div>

                      <a
                        href={`https://${domain.domainName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                        aria-label={`Open ${domain.domainName}`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
            </SectionCard>
          )}

          {/* Domain Stats */}
          {domains.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
              <StatCard
                label="Total Domains"
                value={domains.length}
                hint={`${activeDomains.length} active`}
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                }
              />
              <StatCard
                label="Expiring Soon"
                value={domains.filter(d => isDomainExpiringSoon(d.expirationDate) || isDomainExpiringSoon(d.hostingExpiry)).length}
                hint="Within 30 days"
                tone="warning"
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
              <StatCard
                label="Expired"
                value={domains.filter(d => isDomainExpired(d.expirationDate) || isDomainExpired(d.hostingExpiry)).length}
                hint="Needs renewal"
                tone="danger"
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Servers Tab */}
      {activeTab === "servers" && (
        <div className="space-y-6">
          {servers.length === 0 ? (
            <EmptyState
              title="No servers found"
              description="Contact your administrator to add servers"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              }
            />
          ) : (
            <SectionCard
              title="All Servers"
              headerRight={<span className="badge">{servers.length} server{servers.length !== 1 ? "s" : ""}</span>}
              bodyClassName="space-y-4 stagger-children"
            >
              {servers.map((server) => (
                <div key={server.id} className="card-panel card-panel-hover p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2.5">
                        <span className="break-all text-lg font-bold tracking-tight text-[var(--color-text-primary)]">{server.label}</span>
                        {server.status && <span className="badge">{server.status.replace(/_/g, " ")}</span>}
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {server.provider && (
                          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                            <span>{server.provider}{server.plan ? ` · ${server.plan}` : ""}</span>
                          </div>
                        )}

                        {server.expirationDate && (
                          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Renews: {formatDate(server.expirationDate)}</span>
                            {expiryBadge(server.expirationDate)}
                          </div>
                        )}

                        {server.price != null && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                            <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatMoney(server.price, server.currency)}{server.billingCycle === "MONTHLY" ? "/mo" : "/yr"}</span>
                          </div>
                        )}
                      </div>

                      {server.notes && (
                        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                          <p className="text-sm text-[var(--color-text-secondary)]">{server.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === "team" && <ClientCollaborators />}

      {/* Welcome / pending-payment reminder — shown once per session */}
      <Modal isOpen={showPendingModal} onClose={dismissPendingModal} maxWidth="md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] ring-1 ring-inset ring-[var(--color-warning-border)]">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">
            {firstName ? `Hi ${firstName} 👋` : "Welcome back 👋"}
          </h3>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            {singleCurrency ? (
              <>You have <span className="font-bold text-[var(--color-text-primary)]">{formatMoney(outstandingTotal, singleCurrency)}</span> in pending payments.</>
            ) : (
              <>You have <span className="font-bold text-[var(--color-text-primary)]">{outstandingInvoices.length}</span> invoice{outstandingInvoices.length === 1 ? "" : "s"} awaiting payment.</>
            )}
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {outstandingInvoices.slice(0, 3).map((inv) => {
            const remaining = invoiceRemaining(inv);
            const overdue = isInvoiceOverdue(inv);
            return (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">Invoice #{inv.invoiceNumber}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Due {formatDate(inv.dueDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-sm font-bold text-[var(--color-text-primary)]">{formatMoney(remaining, inv.currency)}</span>
                  <StatusBadge status={overdue ? "OVERDUE" : "PENDING"} />
                </div>
              </div>
            );
          })}
          {outstandingInvoices.length > 3 && (
            <p className="text-center text-xs text-[var(--color-text-muted)]">+ {outstandingInvoices.length - 3} more</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={viewPendingInvoices} className="w-full">
            View invoices
          </Button>
          <Button variant="secondary" onClick={dismissPendingModal} className="w-full">
            Maybe later
          </Button>
        </div>
      </Modal>

      {/* Invoice detail — payment history + receipts for the client */}
      <Modal
        isOpen={!!invoiceDetail}
        onClose={() => setInvoiceDetail(null)}
        title={invoiceDetail ? `Invoice #${invoiceDetail.invoiceNumber}` : undefined}
        maxWidth="lg"
      >
        {invoiceDetail && (() => {
          const total = invoiceDetail.amount || 0;
          const paid = invoicePaid(invoiceDetail);
          const remaining = invoiceRemaining(invoiceDetail);
          const fully = remaining <= 0 && total > 0;
          const overdue = isInvoiceOverdue(invoiceDetail);
          const pays = invoiceDetail.payments ?? [];
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{formatMoney(total, invoiceDetail.currency)}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {(invoiceDetail.issueDate || invoiceDetail.paidAt) && <>Issued {formatDate(invoiceDetail.issueDate || invoiceDetail.paidAt)} · </>}Due {formatDate(invoiceDetail.dueDate)}
                  </p>
                  {invoiceDetail.description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{invoiceDetail.description}</p>}
                </div>
                <StatusBadge status={fully ? "PAID" : overdue ? "OVERDUE" : invoiceDetail.status} />
              </div>

              <div className="card-panel rounded-xl p-4">
                <ProgressBar label="Paid" current={paid} total={total} />
                <div className="mt-2 flex justify-between text-sm tabular-nums">
                  <span className="font-semibold text-[var(--color-success-text)]">{formatMoney(paid, invoiceDetail.currency)} paid</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{fully ? "Fully paid" : `${formatMoney(remaining, invoiceDetail.currency)} left`}</span>
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Payments{pays.length > 0 ? ` · ${pays.length}` : ""}</p>
                {pays.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--color-border-hover)] py-6 text-center text-sm text-[var(--color-text-muted)]">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pays.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-1 ring-inset ring-[var(--color-success-border)]">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">{formatMoney(p.amount, invoiceDetail.currency)}</p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">{formatDate(p.paidAt)}{p.note ? ` · ${p.note}` : ""}</p>
                        </div>
                        {p.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setReceiptPreview(p.receiptUrl!)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                          >
                            View receipt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {invoiceDetail.paymentLink && !fully && (
                <a href={invoiceDetail.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold">
                  Pay now
                </a>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Receipt preview — portaled above the modal (z-100) */}
      {receiptPreview && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-fade-in" onClick={() => setReceiptPreview(null)}>
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-end gap-2">
              <a href={getFileUrl(receiptPreview)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition hover:bg-white/20">Download</a>
              <button type="button" onClick={() => setReceiptPreview(null)} aria-label="Close" className="rounded-lg bg-white/10 p-2 text-white/90 backdrop-blur transition hover:bg-white/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {isImageUrl(receiptPreview) ? (
              <img src={getFileUrl(receiptPreview)} alt="Receipt" className="mx-auto max-h-[85vh] w-auto rounded-xl object-contain shadow-elev-lg" />
            ) : isPdfUrl(receiptPreview) ? (
              <iframe src={getFileUrl(receiptPreview)} title="Receipt" className="h-[85vh] w-full rounded-xl bg-white shadow-elev-lg" />
            ) : (
              <div className="rounded-2xl bg-[var(--color-panel-solid)] p-10 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">This file type can’t be previewed here.</p>
                <a href={getFileUrl(receiptPreview)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold">Download receipt</a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RoleUser;
