import React, { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../api";

export interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  nickname?: string | null;
  avatarEmoji?: string | null;
  skills?: string[];
  company?: string;
  colorHex?: string;
  createdAt: string;
  profileStatus?: string;
  postalAddress?: string;
  address?: string;
  phoneNumber?: string;
  referredById?: number;
}

export type ServiceType = "WEB_APP" | "WEBSITE" | "SMM" | "OTHER";

export interface Project {
  id: number;
  name: string;
  description?: string;
  clientId?: number;
  status?: string;
  serviceType?: ServiceType;
  metadata?: Record<string, unknown> | null;
  client?: { id: number; name: string; company?: string };
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  clientId: number;
  projectId?: number;
  status: string;
  dueDate?: string;
  pinnedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  workers?: { user: User }[];
  client?: User;
  project?: Project;
  milestones?: { id: number; isDone: boolean }[];
}

export interface InvoiceLineItem {
  id?: number;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  sortOrder?: number;
}

export interface Invoice {
  id: number;
  clientId: number;
  amount: number;
  currency?: string;
  dueDate: string;
  status: string;
  invoiceNumber: string;
  description?: string;
  paidAt?: string;
  createdAt: string;
  fileUrl?: string;
  paymentLink?: string | null;
  client?: User;
  issueDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
  amountPaid?: number;
  remaining?: number;
}

export interface Payment {
  id: number;
  invoiceId: number;
  amount: number;
  paidAt: string;
  note?: string | null;
  receiptUrl?: string | null;
  createdAt: string;
}

export interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  hostingProvider?: string;
  isPrimary: boolean;
  client: { id: number; name: string; company?: string };
  createdAt: string;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  status?: string;
  activationEmailSentAt?: string | null;
  renewalReminderSentAt?: string | null;
}

interface EditingDomain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  hostingProvider?: string;
  clientId: number;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  status?: string;
  activationEmailSentAt?: string | null;
  renewalReminderSentAt?: string | null;
}

export interface Server {
  id: number;
  label: string;
  provider?: string | null;
  ipAddress?: string | null;
  plan?: string | null;
  location?: string | null;
  notes?: string | null;
  client: { id: number; name: string; company?: string };
  createdAt: string;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  price?: number | null;
  providerCost?: number | null;
  currency?: string | null;
  billingCycle?: string | null;
  status?: string;
  isActive?: boolean;
  renewalReminderSentAt?: string | null;
}

interface EditingServer {
  id: number;
  label: string;
  provider?: string | null;
  ipAddress?: string | null;
  plan?: string | null;
  location?: string | null;
  notes?: string | null;
  clientId: number;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  price?: number | null;
  providerCost?: number | null;
  currency?: string | null;
  billingCycle?: string | null;
  status?: string;
}

interface AdminContextValue {
  clients: User[];
  workers: User[];
  tasks: Task[];
  projects: Project[];
  invoices: Invoice[];
  domains: Domain[];
  loading: boolean;
  error: string | null;
  editingDomain: EditingDomain | null;
  incompleteClients: User[];
  completeClients: User[];
  activeTasks: Task[];
  completedTasks: Task[];
  pendingInvoices: Invoice[];
  paidInvoices: Invoice[];
  adminOwnClients: User[];
  adminOwnIncompleteClients: User[];
  adminOwnCompleteClients: User[];
  adminOwnTasks: Task[];
  adminOwnInvoices: Invoice[];
  adminOwnPendingInvoices: Invoice[];
  adminOwnPaidInvoices: Invoice[];
  adminOwnDomains: Domain[];
  fetchAll: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  createWorker: (data: { email: string; password: string; name: string; role?: string; company?: string }) => Promise<unknown>;
  deleteUser: (id: number) => Promise<void>;
  createClient: (data: {
    name: string;
    company: string;
    email: string;
    password: string;
    colorHex: string;
    postalAddress?: string;
    domainName?: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    hostingProvider?: string;
    sslExpiry?: string;
  }) => void;
  resendInvite: (clientId: number) => Promise<void>;
  sendPasswordReset: (userId: number) => Promise<void>;
  createTask: (data: { title: string; description: string; clientId: string; workerIds: number[]; dueDate: string; projectId: string }) => void;
  handleCreateProject: (data: { name: string; clientId: string; description: string; serviceType?: string; metadata?: Record<string, unknown> }) => Promise<void>;
  updateProject: (id: number, data: { name?: string; description?: string; status?: string; clientId?: string; serviceType?: string; metadata?: Record<string, unknown> }) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  updateTaskStatus: (id: number, status: string) => Promise<void>;
  pinTask: (id: number, pinned: boolean) => Promise<void>;
  updateTask: (id: number, data: { title?: string; description?: string; clientId?: string; workerIds?: number[]; dueDate?: string; projectId?: string }) => Promise<void>;
  createInvoice: (formData: FormData) => Promise<void>;
  updateInvoice: (id: number, data: { status?: string; dueDate?: string; paymentLink?: string; notes?: string; paidAt?: string | null }) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
  requestPayment: (invoiceId: number) => Promise<void>;
  createDomain: (data: {
    clientId: string;
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    hostingProvider?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    status?: string;
  }) => Promise<void>;
  updateDomain: (domainId: number, data: {
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    hostingProvider?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    status?: string;
  }) => Promise<void>;
  setPrimaryDomain: (id: number) => Promise<void>;
  deleteDomain: (id: number) => void;
  handleEditDomain: (domain: Domain) => void;
  handleCancelEdit: () => void;
  servers: Server[];
  adminOwnServers: Server[];
  editingServer: EditingServer | null;
  createServer: (data: {
    clientId: string;
    label: string;
    provider?: string;
    ipAddress?: string;
    plan?: string;
    location?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    price?: number | null;
    providerCost?: number | null;
    currency?: string;
    billingCycle?: string;
    status?: string;
  }) => Promise<void>;
  updateServer: (serverId: number, data: {
    label: string;
    provider?: string;
    ipAddress?: string;
    plan?: string;
    location?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    price?: number | null;
    providerCost?: number | null;
    currency?: string;
    billingCycle?: string;
    status?: string;
  }) => Promise<void>;
  deleteServer: (id: number) => void;
  handleEditServer: (server: Server) => void;
  handleCancelServerEdit: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<EditingDomain | null>(null);
  const [editingServer, setEditingServer] = useState<EditingServer | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    const role = localStorage.getItem("role");
    const isAdmin = role === "ADMIN";
    const isEraSphere = role === "ERASPHERE";
    try {
      const [usersRes, tasksRes] = await Promise.all([
        API.get("/users"),
        API.get("/tasks"),
      ]);
      const allUsers = usersRes.data;
      const clientUsers = allUsers.filter((u: User) => u.role === "CLIENT");
      setClients(clientUsers);
      setWorkers(isEraSphere ? [] : allUsers.filter((u: User) => u.role === "WORKER"));
      setTasks(tasksRes.data);

      if (isAdmin) {
        const invoicesRes = await API.get("/invoices");
        setInvoices(invoicesRes.data);
        const allDomains: Domain[] = [];
        const allServers: Server[] = [];
        for (const client of clientUsers) {
          try {
            const domainRes = await API.get(`/domains/client/${client.id}`);
            allDomains.push(...domainRes.data);
          } catch {
            // skip
          }
          try {
            const serverRes = await API.get(`/servers/client/${client.id}`);
            allServers.push(...serverRes.data);
          } catch {
            // skip
          }
        }
        setDomains(allDomains);
        setServers(allServers);
      } else {
        setInvoices([]);
        setDomains([]);
        setServers([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAll();
    fetchProjects();
  }, []);

  const incompleteClients = clients.filter((c) => {
    const s = c.profileStatus?.trim().toUpperCase() || "";
    return s === "INCOMPLETE" || s === "PENDING" || s === "" || !c.profileStatus;
  });
  const completeClients = clients.filter((c) => c.profileStatus?.trim().toUpperCase() === "COMPLETE");
  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  // "Paid" = fully settled (status PAID). "Pending" = everything else that
  // isn't fully paid — including OVERDUE — so no invoice ever disappears from
  // both lists (it used to when status was OVERDUE).
  const isPaid = (i: Invoice) => (i.status || "").toUpperCase() === "PAID";
  const pendingInvoices = invoices.filter((i) => !isPaid(i));
  const paidInvoices = invoices.filter((i) => isPaid(i));

  const adminOwnClients = clients.filter((c) => c.role === "CLIENT" && c.referredById == null);
  const adminOwnClientIds = new Set(adminOwnClients.map((c) => c.id));
  const adminOwnIncompleteClients = adminOwnClients.filter((c) => {
    const s = c.profileStatus?.trim().toUpperCase() || "";
    return s === "INCOMPLETE" || s === "PENDING" || s === "" || !c.profileStatus;
  });
  const adminOwnCompleteClients = adminOwnClients.filter((c) => c.profileStatus?.trim().toUpperCase() === "COMPLETE");
  const adminOwnTasks = tasks.filter((t) => t.client == null || t.client.referredById == null);
  const adminOwnInvoices = invoices.filter((i) => !i.client || adminOwnClientIds.has(i.client.id));
  const adminOwnPendingInvoices = adminOwnInvoices.filter((i) => !isPaid(i));
  const adminOwnPaidInvoices = adminOwnInvoices.filter((i) => isPaid(i));
  const adminOwnDomains = domains.filter((d) => adminOwnClientIds.has(d.client.id));
  const adminOwnServers = servers.filter((s) => adminOwnClientIds.has(s.client.id));

  const createWorker = async (data: { email: string; password: string; name: string; role?: string; company?: string }) => {
    const res = await API.post("/users", { ...data, role: data.role || "WORKER" });
    await fetchAll();
    return res.data;
  };

  const deleteUser = async (id: number) => {
    await API.delete(`/users/${id}`);
    await fetchAll();
  };

  const createClient = async (data: {
    name: string;
    company: string;
    email: string;
    password: string;
    colorHex: string;
    postalAddress?: string;
    domainName?: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    hostingProvider?: string;
    sslExpiry?: string;
  }) => {
    await API.post("/users", {
      ...data,
      role: "CLIENT",
      postalAddress: data.postalAddress ?? undefined,
      domainName: data.domainName || undefined,
      domainExpiry: data.domainExpiry || undefined,
      hostingPlan: data.hostingPlan || undefined,
      hostingExpiry: data.hostingExpiry || undefined,
      hostingProvider: data.hostingProvider || undefined,
      sslExpiry: data.sslExpiry || undefined,
    });
    await fetchAll();
  };

  const resendInvite = async (clientId: number) => {
    await API.post(`/users/${clientId}/resend-invite`);
    toast.success("Invite sent successfully!");
  };

  const sendPasswordReset = async (userId: number) => {
    const { data } = await API.post(`/users/${userId}/send-password-reset`);
    toast.success(data?.message ?? "Password reset link sent");
  };

  const createTask = async (data: { title: string; description: string; clientId: string; workerIds: number[]; dueDate: string; projectId: string }) => {
    await API.post("/tasks", {
      title: data.title,
      description: data.description,
      clientId: parseInt(data.clientId, 10),
      workerIds: data.workerIds || [],
      dueDate: data.dueDate || null,
      projectId: data.projectId ? parseInt(data.projectId, 10) : null,
    });
    await fetchAll();
  };

  const updateTask = async (id: number, data: { title?: string; description?: string; clientId?: string; workerIds?: number[]; dueDate?: string; projectId?: string }) => {
    await API.put(`/tasks/${id}`, {
      title: data.title,
      description: data.description,
      clientId: data.clientId ? parseInt(data.clientId, 10) : undefined,
      workerIds: data.workerIds,
      dueDate: data.dueDate || undefined,
      projectId: data.projectId ? parseInt(data.projectId, 10) : (data.projectId === "" ? null : undefined),
    });
    await fetchAll();
    toast.success("Task updated!");
  };

  const handleCreateProject = async (data: { name: string; clientId: string; description: string; serviceType?: string; metadata?: Record<string, unknown> }) => {
    await API.post("/projects", {
      name: data.name,
      clientId: data.clientId || null,
      description: data.description || null,
      serviceType: data.serviceType || "OTHER",
      metadata: data.metadata ?? undefined,
    });
    await fetchProjects();
  };

  const updateProject = async (id: number, data: { name?: string; description?: string; status?: string; clientId?: string; serviceType?: string; metadata?: Record<string, unknown> }) => {
    await API.patch(`/projects/${id}`, {
      name: data.name,
      description: data.description || null,
      status: data.status,
      clientId: data.clientId ? Number(data.clientId) : null,
      serviceType: data.serviceType,
      metadata: data.metadata,
    });
    await fetchProjects();
    toast.success("Project updated!");
  };

  const deleteProject = async (id: number) => {
    if (!confirm("Delete this project? Tasks assigned to it will become standalone.")) return;
    await API.delete(`/projects/${id}`);
    await fetchProjects();
    toast.success("Project deleted!");
  };

  const deleteTask = async (id: number) => {
    await API.delete(`/tasks/${id}`);
    await fetchAll();
  };

  // Optimistic status change (used by drag-and-drop on the task board).
  const updateTaskStatus = async (id: number, status: string) => {
    // Bump updatedAt locally so the moved card jumps to the top of its new
    // column immediately (latest-worked ordering), matching the server.
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, updatedAt: now } : t)) as typeof prev);
    try {
      await API.patch(`/tasks/${id}/status`, { status });
    } catch (err) {
      await fetchAll(); // revert to server truth on failure
      throw err;
    }
  };

  const pinTask = async (id: number, pinned: boolean) => {
    const pinnedAt = pinned ? new Date().toISOString() : null;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, pinnedAt } : t)) as typeof prev);
    try {
      await API.patch(`/tasks/${id}/pin`, { pinned });
    } catch (err) {
      await fetchAll(); // revert to server truth on failure
      throw err;
    }
  };

  const createInvoice = async (formData: FormData) => {
    await API.post("/invoices", formData, { headers: { "Content-Type": "multipart/form-data" } });
    await fetchAll();
  };

  const updateInvoice = async (id: number, data: { status?: string; dueDate?: string; paymentLink?: string; notes?: string; paidAt?: string | null }) => {
    await API.put(`/invoices/${id}`, data);
    await fetchAll();
    toast.success("Invoice updated!");
  };

  const deleteInvoice = async (id: number) => {
    await API.delete(`/invoices/${id}`);
    await fetchAll();
  };

  const requestPayment = async (invoiceId: number) => {
    await API.post(`/invoices/${invoiceId}/request-payment`);
    toast.success("Payment request sent!");
  };

  const createDomain = async (data: {
    clientId: string;
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    hostingProvider?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    status?: string;
  }) => {
    await API.post("/domains", {
      clientId: Number(data.clientId),
      domainName: data.domainName,
      domainExpiry: data.domainExpiry || null,
      hostingPlan: data.hostingPlan || null,
      hostingExpiry: data.hostingExpiry || null,
      hostingProvider: data.hostingProvider || null,
      notes: data.notes || null,
      activationDate: data.activationDate || null,
      expirationDate: data.expirationDate || null,
      lifespanYears: data.lifespanYears ?? null,
      status: data.status || "PENDING",
    });
    await fetchAll();
    toast.success("Domain added successfully!");
  };

  const updateDomain = async (
    domainId: number,
    data: {
      domainName: string;
      domainExpiry?: string;
      hostingPlan?: string;
      hostingExpiry?: string;
    hostingProvider?: string;
      notes?: string;
      activationDate?: string;
      expirationDate?: string;
      lifespanYears?: number | null;
      status?: string;
    }
  ) => {
    await API.put(`/domains/${domainId}`, {
      domainName: data.domainName,
      domainExpiry: data.domainExpiry || null,
      hostingPlan: data.hostingPlan || null,
      hostingExpiry: data.hostingExpiry || null,
      hostingProvider: data.hostingProvider || null,
      notes: data.notes || null,
      activationDate: data.activationDate || null,
      expirationDate: data.expirationDate || null,
      lifespanYears: data.lifespanYears ?? null,
      status: data.status,
    });
    setEditingDomain(null);
    await fetchAll();
    toast.success("Domain updated successfully!");
  };

  const setPrimaryDomain = async (id: number) => {
    await API.post(`/domains/${id}/set-primary`);
    await fetchAll();
    toast.success("Primary domain updated!");
  };

  const deleteDomain = async (id: number) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;
    await API.delete(`/domains/${id}`);
    await fetchAll();
    toast.success("Domain deleted successfully!");
  };

  const handleEditDomain = (domain: Domain) => {
    setEditingDomain({
      id: domain.id,
      domainName: domain.domainName,
      domainExpiry: domain.domainExpiry,
      hostingPlan: domain.hostingPlan,
      hostingExpiry: domain.hostingExpiry,
      clientId: domain.client.id,
      activationDate: domain.activationDate,
      expirationDate: domain.expirationDate,
      lifespanYears: domain.lifespanYears,
      status: domain.status,
      activationEmailSentAt: domain.activationEmailSentAt,
      renewalReminderSentAt: domain.renewalReminderSentAt,
    });
  };

  const handleCancelEdit = () => setEditingDomain(null);

  const createServer = async (data: {
    clientId: string;
    label: string;
    provider?: string;
    ipAddress?: string;
    plan?: string;
    location?: string;
    notes?: string;
    activationDate?: string;
    expirationDate?: string;
    lifespanYears?: number | null;
    price?: number | null;
    providerCost?: number | null;
    currency?: string;
    billingCycle?: string;
    status?: string;
  }) => {
    await API.post("/servers", {
      clientId: Number(data.clientId),
      label: data.label,
      provider: data.provider || null,
      ipAddress: data.ipAddress || null,
      plan: data.plan || null,
      location: data.location || null,
      notes: data.notes || null,
      activationDate: data.activationDate || null,
      expirationDate: data.expirationDate || null,
      lifespanYears: data.lifespanYears ?? null,
      price: data.price ?? null,
      providerCost: data.providerCost ?? null,
      currency: data.currency || "EUR",
      billingCycle: data.billingCycle || "YEARLY",
      status: data.status || "PENDING",
    });
    await fetchAll();
    toast.success("Server added successfully!");
  };

  const updateServer = async (
    serverId: number,
    data: {
      label: string;
      provider?: string;
      ipAddress?: string;
      plan?: string;
      location?: string;
      notes?: string;
      activationDate?: string;
      expirationDate?: string;
      lifespanYears?: number | null;
      price?: number | null;
      providerCost?: number | null;
      currency?: string;
      billingCycle?: string;
      status?: string;
    }
  ) => {
    await API.put(`/servers/${serverId}`, {
      label: data.label,
      provider: data.provider || null,
      ipAddress: data.ipAddress || null,
      plan: data.plan || null,
      location: data.location || null,
      notes: data.notes || null,
      activationDate: data.activationDate || null,
      expirationDate: data.expirationDate || null,
      lifespanYears: data.lifespanYears ?? null,
      price: data.price ?? null,
      providerCost: data.providerCost ?? null,
      currency: data.currency || "EUR",
      billingCycle: data.billingCycle || "YEARLY",
      status: data.status,
    });
    setEditingServer(null);
    await fetchAll();
    toast.success("Server updated successfully!");
  };

  const deleteServer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this server?")) return;
    await API.delete(`/servers/${id}`);
    await fetchAll();
    toast.success("Server deleted successfully!");
  };

  const handleEditServer = (server: Server) => {
    setEditingServer({
      id: server.id,
      label: server.label,
      provider: server.provider,
      ipAddress: server.ipAddress,
      plan: server.plan,
      location: server.location,
      notes: server.notes,
      clientId: server.client.id,
      activationDate: server.activationDate,
      expirationDate: server.expirationDate,
      lifespanYears: server.lifespanYears,
      price: server.price,
      providerCost: server.providerCost,
      currency: server.currency,
      billingCycle: server.billingCycle,
      status: server.status,
    });
  };

  const handleCancelServerEdit = () => setEditingServer(null);

  const value: AdminContextValue = {
    clients,
    workers,
    tasks,
    projects,
    invoices,
    domains,
    loading,
    error,
    editingDomain,
    incompleteClients,
    completeClients,
    activeTasks,
    completedTasks,
    pendingInvoices,
    paidInvoices,
    adminOwnClients,
    adminOwnIncompleteClients,
    adminOwnCompleteClients,
    adminOwnTasks,
    adminOwnInvoices,
    adminOwnPendingInvoices,
    adminOwnPaidInvoices,
    adminOwnDomains,
    fetchAll,
    fetchProjects,
    createWorker,
    deleteUser,
    createClient,
    resendInvite,
    sendPasswordReset,
    createTask,
    handleCreateProject,
    updateProject,
    deleteProject,
    deleteTask,
    updateTaskStatus,
    pinTask,
    updateTask,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    requestPayment,
    createDomain,
    updateDomain,
    setPrimaryDomain,
    deleteDomain,
    handleEditDomain,
    handleCancelEdit,
    servers,
    adminOwnServers,
    editingServer,
    createServer,
    updateServer,
    deleteServer,
    handleEditServer,
    handleCancelServerEdit,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
