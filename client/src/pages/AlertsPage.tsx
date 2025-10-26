import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate?: string;
  client?: { name: string };
  worker?: { name: string };
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

const colors = {
  primary: "#5B4FFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export default function AlertsPage() {
  const navigate = useNavigate();
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

  const expiringDomains = domains.filter(d => {
    if (d.domainExpiry) {
      const expiryDate = new Date(d.domainExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  });

  const expiringHosting = domains.filter(d => {
    if (d.hostingExpiry) {
      const expiryDate = new Date(d.hostingExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  });

  const expiringSSL = domains.filter(d => {
    if (d.sslExpiry) {
      const expiryDate = new Date(d.sslExpiry);
      return expiryDate > new Date() && expiryDate <= thirtyDaysFromNow;
    }
    return false;
  });

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.danger, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.warning, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading alerts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-gray-50 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Attention <span style={{ color: colors.danger }}>Needed</span>
            </h1>
            <p className="mt-2 text-gray-600">Items requiring immediate action</p>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-red-600">{totalAlerts}</h2>
              <p className="text-gray-600">Items need your attention</p>
            </div>
          </div>
        </div>

        {/* Alerts Sections */}
        <div className="space-y-6">
          {/* Expiring Domains */}
          {expiringDomains.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-50">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Expiring Domains</h3>
                  <p className="text-sm text-gray-500">{expiringDomains.length} domains expiring within 30 days</p>
                </div>
              </div>

              <div className="space-y-3">
                {expiringDomains.map((domain) => {
                  const daysLeft = getDaysUntil(domain.domainExpiry!);
                  return (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 transition-all border-l-4 border-orange-500 rounded-r-lg cursor-pointer bg-orange-50 hover:shadow-md"
                      onClick={() => navigate("/dashboard", { state: { activeTab: "domains" } })}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{domain.domainName}</h4>
                        <p className="text-sm text-gray-600">
                          {domain.client.name} • Expires: {formatDate(domain.domainExpiry!)} • {daysLeft} days left
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expiring Hosting */}
          {expiringHosting.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Expiring Hosting</h3>
                  <p className="text-sm text-gray-500">{expiringHosting.length} hosting plans expiring within 30 days</p>
                </div>
              </div>

              <div className="space-y-3">
                {expiringHosting.map((domain) => {
                  const daysLeft = getDaysUntil(domain.hostingExpiry!);
                  return (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 transition-all border-l-4 border-indigo-500 rounded-r-lg cursor-pointer bg-indigo-50 hover:shadow-md"
                      onClick={() => navigate("/dashboard", { state: { activeTab: "domains" } })}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{domain.domainName}</h4>
                        <p className="text-sm text-gray-600">
                          {domain.client.name} • Hosting expires: {formatDate(domain.hostingExpiry!)} • {daysLeft} days left
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expiring SSL */}
          {expiringSSL.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-50">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Expiring SSL Certificates</h3>
                  <p className="text-sm text-gray-500">{expiringSSL.length} SSL certificates expiring within 30 days</p>
                </div>
              </div>

              <div className="space-y-3">
                {expiringSSL.map((domain) => {
                  const daysLeft = getDaysUntil(domain.sslExpiry!);
                  return (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 transition-all border-l-4 border-green-500 rounded-r-lg cursor-pointer bg-green-50 hover:shadow-md"
                      onClick={() => navigate("/dashboard", { state: { activeTab: "domains" } })}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{domain.domainName}</h4>
                        <p className="text-sm text-gray-600">
                          {domain.client.name} • SSL expires: {formatDate(domain.sslExpiry!)} • {daysLeft} days left
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Approval Tasks */}
          {pendingApprovalTasks.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-50">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tasks Awaiting Approval</h3>
                  <p className="text-sm text-gray-500">{pendingApprovalTasks.length} tasks need review</p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingApprovalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 transition-all border-l-4 border-purple-500 rounded-r-lg cursor-pointer bg-purple-50 hover:shadow-md"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "tasks" } })}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">
                        Worker: {task.worker?.name || "Unassigned"} • Client: {task.client?.name || "Unknown"}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-50">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Overdue Tasks</h3>
                  <p className="text-sm text-gray-500">{overdueTasks.length} tasks past deadline</p>
                </div>
              </div>

              <div className="space-y-3">
                {overdueTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 transition-all border-l-4 border-red-500 rounded-r-lg cursor-pointer bg-red-50 hover:shadow-md"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "tasks" } })}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">
                        Due: {task.dueDate ? formatDate(task.dueDate) : "No date"} • Status: {task.status}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Invoices */}
          {overdueInvoices.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-50">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Overdue Invoices</h3>
                  <p className="text-sm text-gray-500">
                    {overdueInvoices.length} invoices • {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0))} outstanding
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {overdueInvoices.slice(0, 10).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 transition-all border-l-4 rounded-r-lg cursor-pointer border-amber-500 bg-amber-50 hover:shadow-md"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</h4>
                      <p className="text-sm text-gray-600">
                        {invoice.client?.name} • {formatCurrency(invoice.amount)} • Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unpaid Invoices */}
          {unpaidInvoices.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-50">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Pending Invoices</h3>
                  <p className="text-sm text-gray-500">
                    {unpaidInvoices.length} unpaid • {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0))} pending
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {unpaidInvoices.slice(0, 10).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 transition-all border-l-4 border-yellow-500 rounded-r-lg cursor-pointer bg-yellow-50 hover:shadow-md"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "invoices" } })}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</h4>
                      <p className="text-sm text-gray-600">
                        {invoice.client?.name} • {formatCurrency(invoice.amount)} • Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incomplete Profiles */}
          {incompleteProfiles.length > 0 && (
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Incomplete Client Profiles</h3>
                  <p className="text-sm text-gray-500">{incompleteProfiles.length} clients need to complete onboarding</p>
                </div>
              </div>

              <div className="space-y-3">
                {incompleteProfiles.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 transition-all border-l-4 border-blue-500 rounded-r-lg cursor-pointer bg-blue-50 hover:shadow-md"
                    onClick={() => navigate("/dashboard", { state: { activeTab: "clients" } })}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{client.name}</h4>
                      <p className="text-sm text-gray-600">
                        {client.email} • {client.company || "No company"} • Joined: {formatDate(client.createdAt)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Clear */}
          {totalAlerts === 0 && (
            <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
              <svg className="w-20 h-20 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">All Clear! 🎉</h2>
              <p className="text-gray-600">No items require immediate attention</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}