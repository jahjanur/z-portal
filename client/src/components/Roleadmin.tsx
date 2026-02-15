import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import TabsNavigation from "./admin/TabsNavigation";
import ClientSearch from "./admin/ClientSearch";
import WorkerForm from "./admin/WorkerForm";
import WorkersList from "./admin/WorkersList";
import ClientForm from "./admin/ClientForm";
import ListDisplay from "./admin/ListDisplay";
import TaskForm from "./admin/TaskForm";
import TasksList from "./admin/TasksList";
import InvoiceForm from "./admin/InvoiceForm";
import InvoicesList from "./admin/InvoicesList";
import DomainForm from "./admin/DomainForm";
import DomainsList from "./admin/DomainsList";
import Offers from "./Offers";
import Timesheet from "./Timesheet";

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  company?: string;
  colorHex?: string;
  createdAt: string;
  profileStatus?: string;
  postalAddress?: string;
  address?: string;
  phoneNumber?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  clientId?: number;
  client?: {
    id: number;
    name: string;
    company?: string;
  };
}

interface Task {
  id: number;
  title: string;
  description?: string;
  clientId: number;
  projectId?: number;
  status: string;
  dueDate?: string;
  workers?: { user: User }[];
  client?: User;
  project?: Project;
}

interface Invoice {
  id: number;
  clientId: number;
  amount: number;
  dueDate: string;
  status: string;
  invoiceNumber: string;
  description?: string;
  paidAt?: string;
  createdAt: string;
  fileUrl?: string;
  client?: User;
}

interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  isPrimary: boolean;
  client: {
    id: number;
    name: string;
    company?: string;
  };
  createdAt: string;
}

const colors = {
  primary: "rgba(255,255,255,0.12)",
  secondary: "#374151",
  accent: "#6B7280",
  light: "#F8F9FA",
  dark: "#1A1A2E",
};

const RoleAdmin: React.FC = () => {
  const location = useLocation();
  const [clients, setClients] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workers" | "clients" | "tasks" | "invoices" | "domains" | "timesheets" | "offers">("workers");
  
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showCompletedProfiles, setShowCompletedProfiles] = useState(false);
  const [showPaidInvoices, setShowPaidInvoices] = useState(false);

  const [editingDomain, setEditingDomain] = useState<{
    id: number;
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    clientId: number;
  } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, tasksRes, invoicesRes] = await Promise.all([
        API.get("/users"),
        API.get("/tasks"),
        API.get("/invoices"),
      ]);

      const allUsers = usersRes.data;
      const clientUsers = allUsers.filter((u: User) => u.role === "CLIENT");
      setClients(clientUsers);
      setWorkers(allUsers.filter((u: User) => u.role === "WORKER"));
      setTasks(tasksRes.data);
      setInvoices(invoicesRes.data);

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
    } catch (err: unknown) {
      console.error("Fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await API.get("/projects");
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as "workers" | "clients" | "tasks" | "invoices" | "domains" | "offers");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const incompleteClients = clients.filter(c => {
    const status = c.profileStatus?.trim().toUpperCase() || "";
    return status === "INCOMPLETE" || status === "PENDING" || status === "" || !c.profileStatus;
  });
  
  const completeClients = clients.filter(c => c.profileStatus?.trim().toUpperCase() === "COMPLETE");
  
  const activeTasks = tasks.filter(t => t.status !== "COMPLETED");
  const completedTasks = tasks.filter(t => t.status === "COMPLETED");
  
  const pendingInvoices = invoices.filter(i => i.status === "PENDING");
  const paidInvoices = invoices.filter(i => i.status === "PAID");

  const createWorker = async (workerData: { email: string; password: string; name: string }) => {
    const response = await API.post("/users", { ...workerData, role: "WORKER" });
    fetchAll();
    return response.data;
  };

  const deleteUser = async (id: number) => {
    try {
      await API.delete(`/users/${id}`);
      fetchAll();
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const createClient = async (clientData: {
    name: string;
    company: string;
    email: string;
    password: string;
    colorHex: string;
  }) => {
    try {
      await API.post("/users", { ...clientData, role: "CLIENT" });
      fetchAll();
    } catch (err) {
      console.error("Error creating client:", err);
    }
  };

  const resendInvite = async (clientId: number) => {
    try {
      await API.post(`/users/${clientId}/resend-invite`);
      alert("Invite sent successfully!");
    } catch (err) {
      console.error("Error resending invite:", err);
      alert("Failed to send invite.");
    }
  };

  const createTask = async (taskData: {
    title: string;
    description: string;
    clientId: string;
    workerIds: number[];
    dueDate: string;
    projectId: string;
  }) => {
    try {
      await API.post("/tasks", {
        title: taskData.title,
        description: taskData.description,
        clientId: parseInt(taskData.clientId, 10),
        workerIds: taskData.workerIds || [],
        dueDate: taskData.dueDate || null,
        projectId: taskData.projectId ? parseInt(taskData.projectId, 10) : null,
      });
      fetchAll();
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleCreateProject = async (projectData: { name: string; clientId: string; description: string }) => {
    try {
      await API.post("/projects", {
        name: projectData.name,
        clientId: projectData.clientId || null,
        description: projectData.description || null,
      });
      await fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await API.delete(`/tasks/${id}`);
      fetchAll();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const createInvoice = async (formData: FormData) => {
    try {
      await API.post("/invoices", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchAll();
    } catch (err) {
      console.error("Error creating invoice:", err);
      alert("Failed to create invoice. Please try again.");
    }
  };

  const deleteInvoice = async (id: number) => {
    try {
      await API.delete(`/invoices/${id}`);
      fetchAll();
    } catch (err) {
      console.error("Error deleting invoice:", err);
    }
  };

  const createDomain = async (domainData: {
    clientId: string;
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    notes?: string;
  }) => {
    try {
      await API.post("/domains", {
        clientId: Number(domainData.clientId),
        domainName: domainData.domainName,
        domainExpiry: domainData.domainExpiry || null,
        hostingPlan: domainData.hostingPlan || null,
        hostingExpiry: domainData.hostingExpiry || null,
      });
      fetchAll();
      alert("Domain added successfully!");
    } catch (err: unknown) {
      console.error("Error adding domain:", err);
      alert("Failed to add domain. Please try again.");
    }
  };

  const updateDomain = async (domainId: number, domainData: {
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    notes?: string;
  }) => {
    try {
      await API.put(`/domains/${domainId}`, {
        domainName: domainData.domainName,
        domainExpiry: domainData.domainExpiry || null,
        hostingPlan: domainData.hostingPlan || null,
        hostingExpiry: domainData.hostingExpiry || null,
      });
      setEditingDomain(null);
      fetchAll();
      alert("Domain updated successfully!");
    } catch (err: unknown) {
      console.error("Error updating domain:", err);
      alert("Failed to update domain. Please try again.");
    }
  };

  const deleteDomain = async (id: number) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;
    
    try {
      await API.delete(`/domains/${id}`);
      fetchAll();
      alert("Domain deleted successfully!");
    } catch (err: unknown) {
      console.error("Error deleting domain:", err);
      alert("Failed to delete domain. Please try again.");
    }
  };

  const handleEditDomain = (domain: Domain) => {
    setEditingDomain({
      id: domain.id,
      domainName: domain.domainName,
      domainExpiry: domain.domainExpiry,
      hostingPlan: domain.hostingPlan,
      hostingExpiry: domain.hostingExpiry,
      clientId: domain.client.id,
    });
  };

  const handleCancelEdit = () => {
    setEditingDomain(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-80" />
            <div className="w-3 h-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.1s" }} />
            <div className="w-3 h-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-40" style={{ animationDelay: "0.2s" }} />
          </div>
          <span className="text-lg font-medium text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-md p-6 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] rounded-2xl">
          <p className="mb-2 text-lg font-semibold text-[var(--color-destructive-text)]">Error:</p>
          <p className="text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 bg-[var(--color-bg)]">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Admin <span className="text-[var(--color-text-muted)]">Dashboard</span>
          </h1>
          <p className="text-lg text-[var(--color-text-muted)]">Manage workers, clients, tasks, invoices, domains, and timesheets</p>
        </div>

        {/* Tab Navigation */}
        <TabsNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={{
            workers: workers.length,
            clients: clients.length,
            tasks: tasks.length,
            invoices: invoices.length,
            domains: domains.length,
            offers: null,
            timesheets: null,
          }}
          colors={colors}
        />

        {/* Client Search (only shown on clients tab) */}
        {activeTab === "clients" && (
          <ClientSearch clients={clients} onDelete={deleteUser} colors={colors} />
        )}

        {/* Dynamic Content */}
        <div className="rounded-2xl card-panel p-6 shadow-xl backdrop-blur-xl">
          {activeTab === "workers" && (
            <>
              <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Workers Management</h2>
              <WorkerForm onSubmit={createWorker} />
              <WorkersList workers={workers} onDelete={deleteUser} />
            </>
          )}

          {activeTab === "clients" && (
            <>
              <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Clients Management</h2>
              <ClientForm onSubmit={createClient} colors={colors} />
              
              {/* Incomplete Profiles Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Incomplete Profiles 
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                      ({incompleteClients.length})
                    </span>
                  </h3>
                </div>
                {incompleteClients.length > 0 ? (
                  <ListDisplay
                    items={incompleteClients}
                    onDelete={deleteUser}
                    onResendInvite={resendInvite}
                    showProfileStatus={true}
                    getProfileStatus={(client) => client.profileStatus}
                    renderItem={(c) => (
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {c.company} • {c.email}
                        </p>
                        {c.postalAddress && (
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">📍 {c.postalAddress}</p>
                        )}
                      </div>
                    )}
                  />
                ) : (
                  <div className="py-8 text-center rounded-xl card-panel">
                    <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">All profiles are complete! 🎉</p>
                  </div>
                )}
              </div>

              {/* Complete Profiles Section - Collapsible */}
              <div className="mt-8">
                <button
                  onClick={() => setShowCompletedProfiles(!showCompletedProfiles)}
                  className="flex items-center justify-between w-full p-4 mb-4 text-left transition-colors rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                >
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Complete Profiles 
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                      ({completeClients.length})
                    </span>
                  </h3>
                  <svg 
                    className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${showCompletedProfiles ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCompletedProfiles && (
                  <div>
                    {completeClients.length > 0 ? (
                      <ListDisplay
                        items={completeClients}
                        onDelete={deleteUser}
                        showProfileStatus={true}
                        getProfileStatus={(client) => client.profileStatus}
                        renderItem={(c) => (
                          <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {c.company} • {c.email}
                            </p>
                            {c.postalAddress && (
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">📍 {c.postalAddress}</p>
                            )}
                          </div>
                        )}
                      />
                    ) : (
                      <p className="py-4 text-sm text-center text-[var(--color-text-muted)] rounded-xl bg-[var(--color-surface-2)]">No complete profiles yet</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "tasks" && (
            <>
              <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Tasks Management</h2>
              <TaskForm
                onSubmit={createTask}
                clients={clients}
                workers={workers}
                projects={projects}
                onCreateProject={handleCreateProject}
              />
              
              {/* Active Tasks Section */}
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
                  Active Tasks 
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                    ({activeTasks.length})
                  </span>
                </h3>
                {activeTasks.length > 0 ? (
                  <TasksList tasks={activeTasks} onDelete={deleteTask} colors={colors} />
                ) : (
                  <div className="py-8 text-center rounded-xl card-panel">
                    <svg className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">No active tasks</p>
                  </div>
                )}
              </div>

              {/* Completed Tasks Section - Collapsible */}
              <div className="mt-8">
                <button
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="flex items-center justify-between w-full p-4 mb-4 text-left transition-colors rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                >
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Completed Tasks 
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                      ({completedTasks.length})
                    </span>
                  </h3>
                  <svg 
                    className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${showCompletedTasks ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCompletedTasks && (
                  <div>
                    {completedTasks.length > 0 ? (
                      <TasksList tasks={completedTasks} onDelete={deleteTask} colors={colors} />
                    ) : (
                      <p className="py-4 text-sm text-center text-[var(--color-text-muted)] rounded-xl bg-[var(--color-surface-2)]">No completed tasks yet</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "invoices" && (
            <>
              <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Invoices Management</h2>
              <InvoiceForm onSubmit={createInvoice} clients={clients} colors={colors} />
              
              {/* Pending Invoices Section */}
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
                  Pending Invoices 
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                    ({pendingInvoices.length})
                  </span>
                </h3>
                {pendingInvoices.length > 0 ? (
                  <InvoicesList invoices={pendingInvoices} onDelete={deleteInvoice} colors={colors} />
                ) : (
                  <div className="py-8 text-center rounded-xl card-panel">
                    <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">All invoices are paid! 💰</p>
                  </div>
                )}
              </div>

              {/* Paid Invoices Section - Collapsible */}
              <div className="mt-8">
                <button
                  onClick={() => setShowPaidInvoices(!showPaidInvoices)}
                  className="flex items-center justify-between w-full p-4 mb-4 text-left transition-colors rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                >
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Paid Invoices 
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                      ({paidInvoices.length})
                    </span>
                  </h3>
                  <svg 
                    className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${showPaidInvoices ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPaidInvoices && (
                  <div>
                    {paidInvoices.length > 0 ? (
                      <InvoicesList invoices={paidInvoices} onDelete={deleteInvoice} colors={colors} />
                    ) : (
                      <p className="py-4 text-sm text-center text-[var(--color-text-muted)] rounded-xl bg-[var(--color-surface-2)]">No paid invoices yet</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "domains" && (
            <>
              <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Domains Management</h2>
              <DomainForm 
                onSubmit={createDomain}
                onUpdate={updateDomain}
                clients={clients}
                colors={colors}
                editingDomain={editingDomain}
                onCancelEdit={handleCancelEdit}
              />
              <DomainsList 
                domains={domains} 
                onEdit={handleEditDomain}
                onDelete={deleteDomain} 
                colors={colors} 
              />
            </>
          )}

          {activeTab === "offers" && <Offers />}

          {activeTab === "timesheets" && <Timesheet/>}

        </div>
      </div>
    </div>
  );
};

export default RoleAdmin;