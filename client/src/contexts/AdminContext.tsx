import React, { createContext, useContext, useEffect, useState } from "react";
import API from "../api";

export interface User {
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

export interface Project {
  id: number;
  name: string;
  description?: string;
  clientId?: number;
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
  workers?: { user: User }[];
  client?: User;
  project?: Project;
}

export interface Invoice {
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

export interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  isPrimary: boolean;
  client: { id: number; name: string; company?: string };
  createdAt: string;
}

interface EditingDomain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  clientId: number;
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
  fetchAll: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  createWorker: (data: { email: string; password: string; name: string }) => Promise<unknown>;
  deleteUser: (id: number) => Promise<void>;
  createClient: (data: { name: string; company: string; email: string; password: string; colorHex: string }) => void;
  resendInvite: (clientId: number) => Promise<void>;
  createTask: (data: { title: string; description: string; clientId: string; workerIds: number[]; dueDate: string; projectId: string }) => void;
  handleCreateProject: (data: { name: string; clientId: string; description: string }) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  createInvoice: (formData: FormData) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
  createDomain: (data: { clientId: string; domainName: string; domainExpiry?: string; hostingPlan?: string; hostingExpiry?: string; notes?: string }) => void;
  updateDomain: (domainId: number, data: { domainName: string; domainExpiry?: string; hostingPlan?: string; hostingExpiry?: string; notes?: string }) => Promise<void>;
  deleteDomain: (id: number) => void;
  handleEditDomain: (domain: Domain) => void;
  handleCancelEdit: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<EditingDomain | null>(null);

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
        } catch {
          // skip
        }
      }
      setDomains(allDomains);
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
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
  const paidInvoices = invoices.filter((i) => i.status === "PAID");

  const createWorker = async (data: { email: string; password: string; name: string }) => {
    const res = await API.post("/users", { ...data, role: "WORKER" });
    await fetchAll();
    return res.data;
  };

  const deleteUser = async (id: number) => {
    await API.delete(`/users/${id}`);
    await fetchAll();
  };

  const createClient = async (data: { name: string; company: string; email: string; password: string; colorHex: string }) => {
    await API.post("/users", { ...data, role: "CLIENT" });
    await fetchAll();
  };

  const resendInvite = async (clientId: number) => {
    await API.post(`/users/${clientId}/resend-invite`);
    alert("Invite sent successfully!");
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

  const handleCreateProject = async (data: { name: string; clientId: string; description: string }) => {
    await API.post("/projects", {
      name: data.name,
      clientId: data.clientId || null,
      description: data.description || null,
    });
    await fetchProjects();
  };

  const deleteTask = async (id: number) => {
    await API.delete(`/tasks/${id}`);
    await fetchAll();
  };

  const createInvoice = async (formData: FormData) => {
    await API.post("/invoices", formData, { headers: { "Content-Type": "multipart/form-data" } });
    await fetchAll();
  };

  const deleteInvoice = async (id: number) => {
    await API.delete(`/invoices/${id}`);
    await fetchAll();
  };

  const createDomain = async (data: { clientId: string; domainName: string; domainExpiry?: string; hostingPlan?: string; hostingExpiry?: string; notes?: string }) => {
    await API.post("/domains", {
      clientId: Number(data.clientId),
      domainName: data.domainName,
      domainExpiry: data.domainExpiry || null,
      hostingPlan: data.hostingPlan || null,
      hostingExpiry: data.hostingExpiry || null,
    });
    await fetchAll();
    alert("Domain added successfully!");
  };

  const updateDomain = async (domainId: number, data: { domainName: string; domainExpiry?: string; hostingPlan?: string; hostingExpiry?: string; notes?: string }) => {
    await API.put(`/domains/${domainId}`, {
      domainName: data.domainName,
      domainExpiry: data.domainExpiry || null,
      hostingPlan: data.hostingPlan || null,
      hostingExpiry: data.hostingExpiry || null,
    });
    setEditingDomain(null);
    await fetchAll();
    alert("Domain updated successfully!");
  };

  const deleteDomain = async (id: number) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;
    await API.delete(`/domains/${id}`);
    await fetchAll();
    alert("Domain deleted successfully!");
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

  const handleCancelEdit = () => setEditingDomain(null);

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
    fetchAll,
    fetchProjects,
    createWorker,
    deleteUser,
    createClient,
    resendInvite,
    createTask,
    handleCreateProject,
    deleteTask,
    createInvoice,
    deleteInvoice,
    createDomain,
    updateDomain,
    deleteDomain,
    handleEditDomain,
    handleCancelEdit,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
