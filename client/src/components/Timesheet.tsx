import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import API from "../api";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT, CONTROL_TEXTAREA, BTN_ACTION } from "./ui/controls";
import DatePicker from "./ui/DatePicker";
import Button from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";
import EmptyState from "./ui/EmptyState";
import { SkeletonRows } from "./ui/Skeleton";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  renderHeader,
  renderMetaBlock,
  renderTable,
  addPageNumbersAndFooter,
  type CompanyInfo,
} from "../utils/pdfHelpers";

/** Main platform logo from public folder for timesheet PDF header. */
const LOGO_PDF_URL =
  typeof window !== "undefined" ? `${window.location.origin}/Zulbera-Text-Logo.svg` : "";

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
      toast.error("Project name is required");
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
      toast.error("Failed to create project");
    }
  };

  const addEntry = async (projectId: number) => {
    if (!entryDate || entryHours <= 0 || entryRate <= 0) {
      toast.error("Please fill in all fields with valid values");
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
      toast.error("Failed to add entry");
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

  const editEntry = async (entryId: number, data: { date: string; hoursWorked: number; hourlyRate: number; notes?: string }) => {
    try {
      await API.patch(`/timesheets/entries/${entryId}`, data);
      fetchProjects();
      toast.success("Entry updated!");
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update entry");
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
      logoDataUrl = LOGO_PDF_URL ? await imageUrlToPngDataUrl(LOGO_PDF_URL) : null;
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
      toast(`No ${isPaid ? "paid" : "pending"} projects to export`);
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
    return <SkeletonRows rows={4} />;
  }

  return (
    <div className="space-y-6">
      {/* New Project Button */}
      <div>
        <button
          type="button"
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className={BTN_ACTION}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
          <h3 className="section-title mb-4">Create New Project</h3>

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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={createProject}>
              Create Project
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewProjectForm(false);
                setProjectName("");
                setSelectedClientId("");
                setProjectDescription("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pending Projects */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="section-title">
            Pending Projects{" "}
            <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
              ({pendingProjects.length})
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            {totalPendingAmount > 0 && (
              <div className="card-panel rounded-xl px-4 py-2">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">Total Pending</p>
                <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                  ${totalPendingAmount.toFixed(2)}
                </p>
              </div>
            )}
            {pendingProjects.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => exportAllProjects(false)}>
                Export All
              </Button>
            )}
          </div>
        </div>

        {pendingProjects.length > 0 ? (
          <div className="space-y-4 stagger-children">
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
                editEntry={editEntry}
                deleteProject={deleteProject}
                markProjectPaid={markProjectPaid}
                exportProjectToPDF={exportProjectToPDF}
              />
            ))}
          </div>
        ) : (
          <EmptyState compact title="No pending projects" description="Create a project to start logging hours." />
        )}
      </section>

      {/* Paid Projects */}
      <section>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowPaidProjects(!showPaidProjects)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowPaidProjects(!showPaidProjects);
            }
          }}
          className="card-panel row-hover mb-4 flex w-full cursor-pointer flex-col gap-2 rounded-xl p-4 text-left sm:flex-row sm:items-center sm:justify-between"
          aria-expanded={showPaidProjects}
        >
          <h3 className="section-title">
            Paid Projects{" "}
            <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
              ({paidProjects.length})
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end sm:gap-3">
            {paidProjects.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  exportAllProjects(true);
                }}
              >
                Export All
              </Button>
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
        </div>

        {showPaidProjects && (
          <div>
            {paidProjects.length > 0 ? (
              <div className="space-y-4 stagger-children">
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
                    editEntry={editEntry}
                    deleteEntry={deleteEntry}
                    deleteProject={deleteProject}
                    markProjectPaid={markProjectPaid}
                    exportProjectToPDF={exportProjectToPDF}
                  />
                ))}
              </div>
            ) : (
              <EmptyState compact title="No paid projects yet" description="Projects marked as paid will show up here." />
            )}
          </div>
        )}
      </section>
    </div>
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
  editEntry: (entryId: number, data: { date: string; hoursWorked: number; hourlyRate: number; notes?: string }) => Promise<void>;
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
  editEntry,
  deleteProject,
  markProjectPaid,
  exportProjectToPDF,
}) => {
  const [showEntries, setShowEntries] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editEntryHours, setEditEntryHours] = useState(0);
  const [editEntryRate, setEditEntryRate] = useState(0);
  const [editEntryNotes, setEditEntryNotes] = useState("");
  const [editEntrySaving, setEditEntrySaving] = useState(false);

  const openEditEntry = (entry: TimesheetEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryDate(entry.date.slice(0, 10));
    setEditEntryHours(entry.hoursWorked);
    setEditEntryRate(entry.hourlyRate);
    setEditEntryNotes(entry.notes ?? "");
  };

  const saveEditEntry = async () => {
    if (!editingEntryId) return;
    setEditEntrySaving(true);
    try {
      await editEntry(editingEntryId, {
        date: editEntryDate,
        hoursWorked: editEntryHours,
        hourlyRate: editEntryRate,
        notes: editEntryNotes || undefined,
      });
      setEditingEntryId(null);
    } finally {
      setEditEntrySaving(false);
    }
  };

  return (
    <div className="card-panel card-panel-hover rounded-2xl p-5 sm:p-6">
      {/* Project Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <h4 className="text-lg font-bold text-[var(--color-text-primary)] break-words sm:text-xl">{project.projectName}</h4>
            <StatusBadge status={project.isPaid ? "PAID" : "PENDING"} />
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
              {new Date(project.dateRange.startDate).toLocaleDateString()} – {new Date(project.dateRange.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-start shrink-0 sm:ml-4 sm:justify-end">
          <button
            type="button"
            onClick={() => exportProjectToPDF(project)}
            className="btn-ghost h-9 w-9 rounded-lg p-2"
            title="Export PDF"
            aria-label="Export PDF"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => markProjectPaid(project.id, !project.isPaid)}
            className="btn-ghost h-9 w-9 rounded-lg p-2"
            title={project.isPaid ? "Mark Unpaid" : "Mark Paid"}
            aria-label={project.isPaid ? "Mark Unpaid" : "Mark Paid"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => deleteProject(project.id)}
            className="h-9 w-9 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-2 text-[var(--color-destructive-text)] transition hover:opacity-90"
            title="Delete Project"
            aria-label="Delete Project"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Summary: StatCard-like chips */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-panel rounded-xl p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Entries</p>
          <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{project.entries.length}</p>
        </div>
        <div className="card-panel rounded-xl p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Total Hours</p>
          <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{project.totalHours?.toFixed(1) || 0}h</p>
        </div>
        <div className="card-panel rounded-xl p-4 min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">Total Pay</p>
          <p className="text-xl font-bold tabular-nums text-[var(--color-text-primary)] break-all">
            ${project.totalPay?.toFixed(2) || 0}
          </p>
        </div>
      </div>

      {/* Add Entry Button */}
      <Button
        variant={activeProjectId === project.id ? "primary" : "secondary"}
        onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}
        className="mb-4 w-full"
      >
        {activeProjectId === project.id ? "Cancel" : "+ Add Entry"}
      </Button>

      {/* Add Entry Form */}
      {activeProjectId === project.id && (
        <div className="card-panel mb-4 rounded-xl p-4 animate-fade-up">
          <h5 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">New Entry</h5>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Date *</label>
              <DatePicker
                value={entryDate}
                onChange={setEntryDate}
                placeholder="yyyy/mm/dd"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm min-h-[40px]"
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
                className="input-dark w-full rounded-lg bg-[var(--color-surface-3)] px-3 py-2 text-sm font-bold tabular-nums"
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

          <Button variant="primary" onClick={() => addEntry(project.id)} className="mt-3 w-full">
            Add Entry
          </Button>
        </div>
      )}

      {/* Entries List */}
      {project.entries.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowEntries(!showEntries)}
            className="card-panel row-hover mb-2 flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left"
            aria-expanded={showEntries}
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
            <div className="table-wrap max-h-[420px] overflow-y-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Details</th>
                    <th className="text-right">Amount</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {project.entries.map((entry) =>
                    editingEntryId === entry.id ? (
                      <tr key={entry.id}>
                        <td colSpan={4} className="bg-[var(--color-surface-2)]">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div>
                                <label className="mb-0.5 block text-xs font-medium text-[var(--color-text-secondary)]">Date</label>
                                <DatePicker value={editEntryDate} onChange={setEditEntryDate} placeholder="yyyy/mm/dd" className="input-dark w-full rounded-lg px-2 py-1.5 text-xs min-h-[34px]" />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs font-medium text-[var(--color-text-secondary)]">Hours</label>
                                <input type="number" step="0.5" min="0" value={editEntryHours || ""} onChange={(e) => setEditEntryHours(Number(e.target.value))} className="input-dark w-full rounded-lg px-2 py-1.5 text-xs" />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs font-medium text-[var(--color-text-secondary)]">Rate ($)</label>
                                <input type="number" step="0.01" min="0" value={editEntryRate || ""} onChange={(e) => setEditEntryRate(Number(e.target.value))} className="input-dark w-full rounded-lg px-2 py-1.5 text-xs" />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs font-medium text-[var(--color-text-secondary)]">Total</label>
                                <input type="text" value={`$${(editEntryHours * editEntryRate).toFixed(2)}`} disabled className="input-dark w-full rounded-lg bg-[var(--color-surface-3)] px-2 py-1.5 text-xs font-bold tabular-nums" />
                              </div>
                            </div>
                            <div>
                              <label className="mb-0.5 block text-xs font-medium text-[var(--color-text-secondary)]">Notes</label>
                              <input type="text" value={editEntryNotes} onChange={(e) => setEditEntryNotes(e.target.value)} placeholder="Optional notes..." className="input-dark w-full rounded-lg px-2 py-1.5 text-xs" />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button variant="primary" size="sm" loading={editEntrySaving} onClick={saveEditEntry}>
                                {editEntrySaving ? "Saving…" : "Save"}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => setEditingEntryId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap font-medium text-[var(--color-text-primary)]">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="tabular-nums text-xs text-[var(--color-text-muted)]">
                            {entry.hoursWorked}h × ${entry.hourlyRate}
                          </span>
                          {entry.notes && (
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{entry.notes}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right font-bold tabular-nums text-[var(--color-text-primary)]">
                          ${entry.totalPay.toFixed(2)}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditEntry(entry)}
                              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                              title="Edit entry"
                              aria-label="Edit entry"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteEntry(entry.id)}
                              className="rounded-lg p-1.5 text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                              title="Delete entry"
                              aria-label="Delete entry"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timesheets;
