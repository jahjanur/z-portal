import { useState, useEffect } from "react";
import API from "../api";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT, CONTROL_TEXTAREA } from "./ui/controls";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  renderHeader,
  renderMetaBlock,
  renderTable,
  addPageNumbersAndFooter,
  type CompanyInfo,
} from "../utils/pdfHelpers";
import logoPdf from "../assets/Artboard 2.svg";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

const DEFAULT_COMPANY: CompanyInfo = {
  companyName: "Zulbera",
  address: "Suite C, Level 7, World Trust Tower, 50 Stanley Street, Central, Hong Kong",
};

/**
 * Convert SVG/image URL to high-res PNG for PDF (jsPDF doesn't support SVG).
 * We rasterize at 3× the display size so the logo stays sharp in the PDF.
 * (Small raster → large on page = blur; large raster → same size on page = sharp.)
 */
function imageUrlToPngDataUrl(url: string, maxW = 500, maxH = 90): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Logo load failed"));
    img.src = url;
  });
}

interface Client {
  id: number;
  name: string;
  company?: string;
}

interface TimesheetEntry {
  id: number;
  date: string;
  hoursWorked: number;
  hourlyRate: number;
  totalPay: number;
  notes?: string;
  createdAt: string;
}

interface TimesheetProject {
  id: number;
  projectName: string;
  clientId?: number;
  client?: Client;
  description?: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  entries: TimesheetEntry[];
  totalHours?: number;
  totalPay?: number;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const Timesheets = () => {
  const [projects, setProjects] = useState<TimesheetProject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaidProjects, setShowPaidProjects] = useState(false);

  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryHours, setEntryHours] = useState<number>(0);
  const [entryRate, setEntryRate] = useState<number>(0);
  const [entryNotes, setEntryNotes] = useState("");

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await API.get("/timesheets/projects");
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await API.get("/users");
      const allUsers = response.data;
      const clientUsers = allUsers.filter((user: { role: string }) => user.role === "CLIENT");
      setClients(clientUsers);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      alert("Project name is required");
      return;
    }

    try {
      await API.post("/timesheets/projects", {
        projectName,
        clientId: selectedClientId || null,
        description: projectDescription || null,
      });

      setProjectName("");
      setSelectedClientId("");
      setProjectDescription("");
      setShowNewProjectForm(false);
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    }
  };

  const addEntry = async (projectId: number) => {
    if (!entryDate || entryHours <= 0 || entryRate <= 0) {
      alert("Please fill in all fields with valid values");
      return;
    }

    try {
      await API.post(`/timesheets/projects/${projectId}/entries`, {
        date: entryDate,
        hoursWorked: entryHours,
        hourlyRate: entryRate,
        notes: entryNotes || null,
      });

      setEntryDate(new Date().toISOString().split("T")[0]);
      setEntryHours(0);
      setEntryRate(0);
      setEntryNotes("");
      setActiveProjectId(null);
      fetchProjects();
    } catch (error) {
      console.error("Error adding entry:", error);
      alert("Failed to add entry");
    }
  };

  const deleteEntry = async (entryId: number) => {
    if (!confirm("Delete this entry?")) return;

    try {
      await API.delete(`/timesheets/entries/${entryId}`);
      fetchProjects();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const deleteProject = async (projectId: number) => {
    if (!confirm("Delete this entire project and all its entries?")) return;

    try {
      await API.delete(`/timesheets/projects/${projectId}`);
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const markProjectPaid = async (projectId: number, isPaid: boolean) => {
    try {
      const endpoint = isPaid
        ? `/timesheets/projects/${projectId}/mark-paid`
        : `/timesheets/projects/${projectId}/mark-unpaid`;
      await API.patch(endpoint);
      fetchProjects();
    } catch (error) {
      console.error("Error updating project status:", error);
    }
  };

  const exportProjectToPDF = async (project: TimesheetProject) => {
    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await imageUrlToPngDataUrl(logoPdf);
    } catch {
      // fallback: no logo, header will show "Zulbera" text
    }

    const doc = new jsPDF();

    // Header: Zulbera logo left, credentials right (minimal)
    let y = renderHeader(doc, { logoUrl: logoDataUrl, companyInfo: DEFAULT_COMPANY });

    // Meta: project, client, period (compact)
    const metaLines: { label: string; value: string }[] = [
      { label: "Project", value: project.projectName },
      { label: "Total entries", value: String(project.entries.length) },
      { label: "Total hours", value: `${project.totalHours?.toFixed(1) ?? 0}h` },
      { label: "Total amount", value: `$${project.totalPay?.toFixed(2) ?? "0.00"}` },
      { label: "Status", value: project.isPaid ? "PAID" : "PENDING" },
    ];
    if (project.client?.company) metaLines.push({ label: "Client company", value: project.client.company });
    if (project.client?.name) metaLines.push({ label: "Client", value: project.client.name });
    if (project.dateRange) {
      metaLines.push({
        label: "Period",
        value: `${new Date(project.dateRange.startDate).toLocaleDateString()} – ${new Date(project.dateRange.endDate).toLocaleDateString()}`,
      });
    }
    y = renderMetaBlock(doc, metaLines, y);

    // Table: Date | Person | Description | Hours | Rate | Amount
    const clientName = project.client?.name ?? project.client?.company ?? "—";
    const tableData = project.entries.map((entry) => [
      new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      clientName,
      entry.notes || "—",
      `${entry.hoursWorked}`,
      `$${entry.hourlyRate.toFixed(2)}`,
      `$${entry.totalPay.toFixed(2)}`,
    ]);
    tableData.push(["", "", "Total", `${project.totalHours?.toFixed(1) ?? 0}`, "", `$${project.totalPay?.toFixed(2) ?? "0.00"}`]);

    const columns = ["Date", "Person", "Description", "Hours", "Rate", "Amount"];
    // Balanced column widths so Date/Amount don't wrap; total ~174mm (A4 − margins)
    renderTable(doc, columns, tableData, {
      startY: y,
      lastRowBold: true,
      columnStyles: {
        0: { cellWidth: 28, halign: "center" },
        1: { cellWidth: 24, halign: "left" },
        2: { cellWidth: 50, halign: "left" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 26, halign: "right" },
      },
    });

    addPageNumbersAndFooter(doc);

    const fileName = `${project.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  const exportAllProjects = (isPaid: boolean) => {
    const projectsToExport = projects.filter((p) => p.isPaid === isPaid);

    if (projectsToExport.length === 0) {
      alert(`No ${isPaid ? "paid" : "pending"} projects to export`);
      return;
    }

    projectsToExport.forEach((project) => {
      exportProjectToPDF(project);
    });
  };

  const pendingProjects = projects.filter((p) => !p.isPaid);
  const paidProjects = projects.filter((p) => p.isPaid);

  const totalPendingAmount = pendingProjects.reduce((sum, p) => sum + (p.totalPay || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-text-primary)]"></div>
          <p className="text-sm text-[var(--color-text-muted)]">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        Timesheets Management
      </h2>

      {/* New Project Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-0"
        >
          <svg className="h-5 w-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="mb-6 rounded-2xl card-panel p-6 shadow-lg backdrop-blur-md">
          <h3 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">Create New Project</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={CONTROL_LABEL}>
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Website Redesign"
                className={CONTROL_INPUT}
                required
              />
            </div>

            <div>
              <label className={CONTROL_LABEL}>
                Client (Optional)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={CONTROL_SELECT}
              >
                <option value="">No Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className={CONTROL_LABEL}>
              Description (Optional)
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              className={CONTROL_TEXTAREA}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={createProject}
              className="btn-primary inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              Create Project
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewProjectForm(false);
                setProjectName("");
                setSelectedClientId("");
                setProjectDescription("");
              }}
              className="btn-secondary inline-flex h-11 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Projects */}
      <div className="mt-8">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Pending Projects
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({pendingProjects.length})
            </span>
          </h3>
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            {totalPendingAmount > 0 && (
              <div className="whitespace-nowrap px-4 py-2 bg-yellow-100 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">
                  Total Pending: ${totalPendingAmount.toFixed(2)}
                </p>
              </div>
            )}
            {pendingProjects.length > 0 && (
              <button
                onClick={() => exportAllProjects(false)}
                className="w-full sm:w-auto h-9 px-3 text-sm font-semibold btn-primary flex items-center justify-center gap-2 rounded-lg"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            )}
          </div>
        </div>

        {pendingProjects.length > 0 ? (
          <div className="space-y-4">
            {pendingProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                activeProjectId={activeProjectId}
                setActiveProjectId={setActiveProjectId}
                entryDate={entryDate}
                setEntryDate={setEntryDate}
                entryHours={entryHours}
                setEntryHours={setEntryHours}
                entryRate={entryRate}
                setEntryRate={setEntryRate}
                entryNotes={entryNotes}
                setEntryNotes={setEntryNotes}
                addEntry={addEntry}
                deleteEntry={deleteEntry}
                deleteProject={deleteProject}
                markProjectPaid={markProjectPaid}
                exportProjectToPDF={exportProjectToPDF}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl card-panel py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">No pending projects</p>
          </div>
        )}
      </div>

      {/* Paid Projects */}
      <div className="mt-8">
        <button
          onClick={() => setShowPaidProjects(!showPaidProjects)}
          className="mb-4 flex w-full flex-col gap-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 text-left transition hover:-translate-y-[1px] card-panel-hover sm:flex-row sm:items-center sm:justify-between"
        >
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Paid Projects
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({paidProjects.length})
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end sm:gap-3">
            {paidProjects.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportAllProjects(true);
                }}
                className="w-full sm:w-auto h-9 px-3 text-sm font-semibold btn-primary flex items-center justify-center gap-2 rounded-lg"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            )}
            <svg
              className={`h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${showPaidProjects ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showPaidProjects && (
          <div>
            {paidProjects.length > 0 ? (
              <div className="space-y-4">
                {paidProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    activeProjectId={activeProjectId}
                    setActiveProjectId={setActiveProjectId}
                    entryDate={entryDate}
                    setEntryDate={setEntryDate}
                    entryHours={entryHours}
                    setEntryHours={setEntryHours}
                    entryRate={entryRate}
                    setEntryRate={setEntryRate}
                    entryNotes={entryNotes}
                    setEntryNotes={setEntryNotes}
                    addEntry={addEntry}
                    deleteEntry={deleteEntry}
                    deleteProject={deleteProject}
                    markProjectPaid={markProjectPaid}
                    exportProjectToPDF={exportProjectToPDF}
                  />
                ))}
              </div>
            ) : (
<p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">
              No paid projects yet
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

interface ProjectCardProps {
  project: TimesheetProject;
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;
  entryDate: string;
  setEntryDate: (date: string) => void;
  entryHours: number;
  setEntryHours: (hours: number) => void;
  entryRate: number;
  setEntryRate: (rate: number) => void;
  entryNotes: string;
  setEntryNotes: (notes: string) => void;
  addEntry: (projectId: number) => void;
  deleteEntry: (entryId: number) => void;
  deleteProject: (projectId: number) => void;
  markProjectPaid: (projectId: number, isPaid: boolean) => void;
  exportProjectToPDF: (project: TimesheetProject) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  activeProjectId,
  setActiveProjectId,
  entryDate,
  setEntryDate,
  entryHours,
  setEntryHours,
  entryRate,
  setEntryRate,
  entryNotes,
  setEntryNotes,
  addEntry,
  deleteEntry,
  deleteProject,
  markProjectPaid,
  exportProjectToPDF,
}) => {
  const [showEntries, setShowEntries] = useState(false);

  return (
    <div className="rounded-2xl card-panel p-4 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover sm:p-6">
      {/* Project Header */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h4 className="text-xl font-bold text-[var(--color-text-primary)] break-words">{project.projectName}</h4>
            <span
              className={`whitespace-nowrap px-3 py-1 text-xs font-semibold rounded-full ${
                project.isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {project.isPaid ? "Paid" : "Pending"}
            </span>
          </div>
          
          {project.client && (
            <p className="text-sm text-[var(--color-text-muted)] break-words">
              Client: {project.client.name} {project.client.company && `(${project.client.company})`}
            </p>
          )}
          
          {project.description && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)] break-words">{project.description}</p>
          )}

          {project.dateRange && (
            <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">
              📅 {new Date(project.dateRange.startDate).toLocaleDateString()} - {new Date(project.dateRange.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-start shrink-0 sm:ml-4 sm:justify-end">
          <button
            onClick={() => exportProjectToPDF(project)}
            className="h-9 w-9 rounded-lg bg-[var(--color-surface-3)] p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]"
            title="Export PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          <button
            onClick={() => markProjectPaid(project.id, !project.isPaid)}
            className={`h-9 w-9 p-2 transition-colors rounded-lg ${
              project.isPaid
                ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                : "text-green-600 bg-green-50 hover:bg-green-100"
            }`}
            title={project.isPaid ? "Mark Unpaid" : "Mark Paid"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button
            onClick={() => deleteProject(project.id)}
            className="h-9 w-9 p-2 text-red-600 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
            title="Delete Project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Summary: stacked on mobile so Total Pay has its own row and doesn't overflow */}
      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Entries</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{project.entries.length}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Total Hours</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{project.totalHours?.toFixed(1) || 0}h</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">Total Pay</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] break-all">
            ${project.totalPay?.toFixed(2) || 0}
          </p>
        </div>
      </div>

      {/* Add Entry Button */}
      <button
        onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}
        className={activeProjectId === project.id ? "btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold mb-4" : "btn-secondary w-full rounded-xl px-4 py-3 text-sm font-semibold mb-4"}
      >
        {activeProjectId === project.id ? "Cancel" : "+ Add Entry"}
      </button>

      {/* Add Entry Form */}
      {activeProjectId === project.id && (
        <div className="mb-4 rounded-xl card-panel p-4">
          <h5 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">New Entry</h5>
          
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Date *</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Hours *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={entryHours || ""}
                onChange={(e) => setEntryHours(Number(e.target.value))}
                placeholder="8.0"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Rate ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryRate || ""}
                onChange={(e) => setEntryRate(Number(e.target.value))}
                placeholder="70.00"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Total</label>
              <input
                type="text"
                value={`$${(entryHours * entryRate).toFixed(2)}`}
                disabled
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-bold bg-[var(--color-surface-3)]"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Notes</label>
            <textarea
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm min-h-[60px]"
            />
          </div>
          
          <button
            onClick={() => addEntry(project.id)}
            className="btn-primary w-full mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Add Entry
          </button>
        </div>
      )}

      {/* Entries List */}
      {project.entries.length > 0 && (
        <>
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-left transition hover:bg-[var(--color-surface-3)]"
          >
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              View Entries ({project.entries.length})
            </span>
            <svg
              className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${showEntries ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showEntries && (
            <div className="space-y-2">
              {project.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {entry.hoursWorked}h × ${entry.hourlyRate}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-[var(--color-text-muted)]">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--color-text-primary)]">
                      ${entry.totalPay.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1 text-red-600 transition-colors rounded bg-red-50 hover:bg-red-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timesheets;