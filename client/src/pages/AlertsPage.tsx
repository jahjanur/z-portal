import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import { SkeletonRows } from "../components/ui/Skeleton";

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate?: string;
  client?: { name: string };
  workers?: { user: { name: string } }[];
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  client?: { name: string; email: string };
}

interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
  profileStatus?: string;
  createdAt: string;
  role?: string;
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

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Presentational section wrapper: card with title + count badge. */
function AlertSection({
  title,
  subtitle,
  count,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="card-panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
        <StatusBadge tone={tone}>{count}</StatusBadge>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** Presentational alert row: title + meta + severity badge, clickable. */
function AlertRow({
  title,
  meta,
  badgeLabel,
  tone,
  onClick,
}: {
  title: string;
  meta: string;
  badgeLabel: string;
  tone: Tone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row-hover flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{title}</h4>
        <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge tone={tone}>{badgeLabel}</StatusBadge>
        <svg className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "ADMIN";
  const tasksPath = isAdmin ? "/admin/zulbera/tasks" : "/admin/tasks";
  const invoicesPath = isAdmin ? "/admin/zulbera/invoices" : "/admin/invoices";
  const clientsPath = isAdmin ? "/admin/zulbera/clients" : "/admin/clients";
  const domainsPath = isAdmin ? "/admin/zulbera/domains" : "/admin/domains";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, invoicesRes, usersRes] = await Promise.all([
        API.get<Task[]>("/tasks"),
        API.get<Invoice[]>("/invoices"),
        API.get("/users"),
      ]);
      setTasks(tasksRes.data);
      setInvoices(invoicesRes.data);

      const allUsers = usersRes.data;
      const clientUsers = allUsers.filter((u: Client) => u.role === "CLIENT");
      setClients(clientUsers);

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
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
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

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const pendingApprovalTasks = tasks.filter(t => t.status === "PENDING_APPROVAL");
  const overdueTasks = tasks.filter(
    t => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < new Date()
  );
  const overdueInvoices = invoices.filter(
    i => i.status === "PENDING" && new Date(i.dueDate) < new Date()
  );
  const unpaidInvoices = invoices.filter(i => i.status === "PENDING");
  const incompleteProfiles = clients.filter(c => c.profileStatus === "INCOMPLETE");

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Presentational sorting: soonest expiry first
  const expiringDomains = domains
    .filter(d => {
      if (d.domainExpiry) {
        const expiryDate = new Date(d.domainExpiry);
        return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
      }
      return false;
    })
    .sort((a, b) => new Date(a.domainExpiry!).getTime() - new Date(b.domainExpiry!).getTime());

  const expiringHosting = domains
    .filter(d => {
      if (d.hostingExpiry) {
        const expiryDate = new Date(d.hostingExpiry);
        return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
      }
      return false;
    })
    .sort((a, b) => new Date(a.hostingExpiry!).getTime() - new Date(b.hostingExpiry!).getTime());

  const expiringSSL = domains
    .filter(d => {
      if (d.sslExpiry) {
        const expiryDate = new Date(d.sslExpiry);
        return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
      }
      return false;
    })
    .sort((a, b) => new Date(a.sslExpiry!).getTime() - new Date(b.sslExpiry!).getTime());

  const totalAlerts =
    pendingApprovalTasks.length +
    overdueTasks.length +
    overdueInvoices.length +
    incompleteProfiles.length +
    expiringDomains.length +
    expiringHosting.length +
    expiringSSL.length;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <PageHeader title="Attention Needed" subtitle="Items requiring immediate action" />
          <SkeletonRows rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Attention Needed"
          subtitle={
            totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts === 1 ? "" : "s"} requiring immediate action`
              : "Items requiring immediate action"
          }
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          }
        />

        {totalAlerts === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="All clear — no alerts"
            description="No items require immediate attention right now."
          />
        ) : (
          <div className="space-y-6 stagger-children">
            {/* Most critical first: overdue tasks */}
            {overdueTasks.length > 0 && (
              <AlertSection
                title="Overdue Tasks"
                subtitle={`${overdueTasks.length} tasks past deadline`}
                count={overdueTasks.length}
                tone="danger"
              >
                {overdueTasks.slice(0, 10).map((task) => (
                  <AlertRow
                    key={task.id}
                    title={task.title}
                    meta={`Due: ${task.dueDate ? formatDate(task.dueDate) : "No date"} • Status: ${task.status}`}
                    badgeLabel="Overdue"
                    tone="danger"
                    onClick={() => navigate(tasksPath)}
                  />
                ))}
              </AlertSection>
            )}

            {/* Overdue invoices */}
            {overdueInvoices.length > 0 && (
              <AlertSection
                title="Overdue Invoices"
                subtitle={`${overdueInvoices.length} invoices • ${formatCurrency(
                  overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)
                )} outstanding`}
                count={overdueInvoices.length}
                tone="danger"
              >
                {overdueInvoices.slice(0, 10).map((invoice) => (
                  <AlertRow
                    key={invoice.id}
                    title={`Invoice #${invoice.invoiceNumber}`}
                    meta={`${invoice.client?.name} • ${formatCurrency(invoice.amount)} • Due: ${formatDate(invoice.dueDate)}`}
                    badgeLabel="Overdue"
                    tone="danger"
                    onClick={() => navigate(invoicesPath)}
                  />
                ))}
              </AlertSection>
            )}

            {/* Domains expiring soonest */}
            {expiringDomains.length > 0 && (
              <AlertSection
                title="Expiring Domains"
                subtitle={`${expiringDomains.length} domains expiring within 30 days`}
                count={expiringDomains.length}
                tone="warning"
              >
                {expiringDomains.map((domain) => {
                  const daysLeft = getDaysUntil(domain.domainExpiry!);
                  return (
                    <AlertRow
                      key={domain.id}
                      title={domain.domainName}
                      meta={`${domain.client.name} • Expires: ${formatDate(domain.domainExpiry!)}`}
                      badgeLabel={`${daysLeft}d left`}
                      tone="warning"
                      onClick={() => navigate(domainsPath)}
                    />
                  );
                })}
              </AlertSection>
            )}

            {/* Expiring hosting */}
            {expiringHosting.length > 0 && (
              <AlertSection
                title="Expiring Hosting"
                subtitle={`${expiringHosting.length} hosting plans expiring within 30 days`}
                count={expiringHosting.length}
                tone="warning"
              >
                {expiringHosting.map((domain) => {
                  const daysLeft = getDaysUntil(domain.hostingExpiry!);
                  return (
                    <AlertRow
                      key={domain.id}
                      title={domain.domainName}
                      meta={`${domain.client.name} • Hosting expires: ${formatDate(domain.hostingExpiry!)}`}
                      badgeLabel={`${daysLeft}d left`}
                      tone="warning"
                      onClick={() => navigate(domainsPath)}
                    />
                  );
                })}
              </AlertSection>
            )}

            {/* Expiring SSL */}
            {expiringSSL.length > 0 && (
              <AlertSection
                title="Expiring SSL Certificates"
                subtitle={`${expiringSSL.length} SSL certificates expiring within 30 days`}
                count={expiringSSL.length}
                tone="warning"
              >
                {expiringSSL.map((domain) => {
                  const daysLeft = getDaysUntil(domain.sslExpiry!);
                  return (
                    <AlertRow
                      key={domain.id}
                      title={domain.domainName}
                      meta={`${domain.client.name} • SSL expires: ${formatDate(domain.sslExpiry!)}`}
                      badgeLabel={`${daysLeft}d left`}
                      tone="warning"
                      onClick={() => navigate(domainsPath)}
                    />
                  );
                })}
              </AlertSection>
            )}

            {/* Pending approval tasks */}
            {pendingApprovalTasks.length > 0 && (
              <AlertSection
                title="Tasks Awaiting Approval"
                subtitle={`${pendingApprovalTasks.length} tasks need review`}
                count={pendingApprovalTasks.length}
                tone="info"
              >
                {pendingApprovalTasks.map((task) => (
                  <AlertRow
                    key={task.id}
                    title={task.title}
                    meta={`Worker: ${
                      task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"
                    } • Client: ${task.client?.name || "Unknown"}`}
                    badgeLabel="Needs review"
                    tone="info"
                    onClick={() => navigate(tasksPath)}
                  />
                ))}
              </AlertSection>
            )}

            {/* Unpaid invoices */}
            {unpaidInvoices.length > 0 && (
              <AlertSection
                title="Pending Invoices"
                subtitle={`${unpaidInvoices.length} unpaid • ${formatCurrency(
                  unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
                )} pending`}
                count={unpaidInvoices.length}
                tone="warning"
              >
                {unpaidInvoices.slice(0, 10).map((invoice) => (
                  <AlertRow
                    key={invoice.id}
                    title={`Invoice #${invoice.invoiceNumber}`}
                    meta={`${invoice.client?.name} • ${formatCurrency(invoice.amount)} • Due: ${formatDate(invoice.dueDate)}`}
                    badgeLabel="Unpaid"
                    tone="warning"
                    onClick={() => navigate(invoicesPath)}
                  />
                ))}
              </AlertSection>
            )}

            {/* Incomplete profiles */}
            {incompleteProfiles.length > 0 && (
              <AlertSection
                title="Incomplete Client Profiles"
                subtitle={`${incompleteProfiles.length} clients need to complete onboarding`}
                count={incompleteProfiles.length}
                tone="warning"
              >
                {incompleteProfiles.map((client) => (
                  <AlertRow
                    key={client.id}
                    title={client.name}
                    meta={`${client.email} • ${client.company || "No company"} • Joined: ${formatDate(client.createdAt)}`}
                    badgeLabel="Incomplete"
                    tone="warning"
                    onClick={() => navigate(clientsPath)}
                  />
                ))}
              </AlertSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
