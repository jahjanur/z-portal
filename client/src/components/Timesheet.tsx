import { useState, useEffect } from "react";
import API from "../api";
import { BTN_ACTION, CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT, CONTROL_TEXTAREA } from "./ui/controls";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

const colors = {
  primary: "rgba(255,255,255,0.12)",
  light: "#F8F9FA",
  dark: "#1A1A2E",
};

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

  const exportProjectToPDF = (project: TimesheetProject) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title with company name
    doc.setFontSize(22);
    doc.setTextColor(91, 79, 255);
    doc.text(project.projectName.toUpperCase(), 14, 20);

    // ePage logo/text in top right
    doc.setFontSize(12);
    doc.setTextColor(91, 79, 255);
    doc.text("Z-Portal", pageWidth - 35, 20);

    // Client details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let yPos = 32;
    
    if (project.client) {
      if (project.client.company) {
        doc.text(`Company name: ${project.client.company}`, 14, yPos);
        yPos += 6;
      }
      doc.text(`Address: ${project.client.name}`, 14, yPos);
      yPos += 6;
    }

    // Summary box with red border highlight
    yPos += 4;
    const summaryBoxY = yPos;
    const summaryBoxHeight = 24;
    
    // Draw red line above summary
    doc.setDrawColor(91, 79, 255);
    doc.setLineWidth(2);
    doc.line(14, summaryBoxY - 2, pageWidth - 14, summaryBoxY - 2);

    // Summary content
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    
    const leftCol = 14;
    const rightCol = pageWidth / 2 + 10;
    
    doc.text(`Total Entries: ${project.entries.length}`, leftCol, summaryBoxY + 5);
    doc.text(`Total Hours: ${project.totalHours?.toFixed(1) || 0}h`, leftCol, summaryBoxY + 12);
    
    doc.text(`Total Amount: $${project.totalPay?.toFixed(2) || 0}`, rightCol, summaryBoxY + 5);
    doc.text(`Status: ${project.isPaid ? "PAID" : "PENDING"}`, rightCol, summaryBoxY + 12);

    if (project.dateRange) {
      doc.text(
        `Period: ${new Date(project.dateRange.startDate).toLocaleDateString()} - ${new Date(project.dateRange.endDate).toLocaleDateString()}`,
        leftCol,
        summaryBoxY + 19
      );
    }

    yPos = summaryBoxY + summaryBoxHeight + 5;

    // Table data
    const tableData = project.entries.map((entry) => [
      new Date(entry.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      `${entry.hoursWorked}h`,
      `$${entry.hourlyRate.toFixed(2)}`,
      `$${entry.totalPay.toFixed(2)}`,
      entry.notes || "-",
    ]);

    // Add summary row at the end
    tableData.push([
      "",
      `${project.totalHours?.toFixed(1) || 0}h`,
      "",
      `$${project.totalPay?.toFixed(2) || 0}`,
      "",
    ]);

    // Add table with improved styling
    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Hours", "Rate", "Total Pay", "Notes"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [91, 79, 255],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 35, halign: "center" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 57, halign: "left" },
      },
      // Style the last row (totals)
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [248, 249, 250] as [number, number, number];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [26, 26, 46] as [number, number, number];
        }
      },
    });

    // Company details footer
    const autoTableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
    const finalY = autoTableDoc.lastAutoTable?.finalY || yPos + 100;
    const footerY = Math.max(finalY + 20, doc.internal.pageSize.height - 70);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Z-Portal", 14, footerY);
    doc.text("Suite C, Level 7, World Trust Tower,", 14, footerY + 5);
    doc.text("50 Stanley Street, Central,", 14, footerY + 10);
    doc.text("Hong Kong", 14, footerY + 15);

    // Page numbers
    const docWithInternal = doc as unknown as {
      internal: {
        getNumberOfPages(): number;
        pageSize: { width: number; height: number };
      };
      setPage(page: number): void;
      setFontSize(size: number): void;
      setTextColor(color: number): void;
      text(text: string, x: number, y: number, options?: { align: string }): void;
    };

    const pageCount = docWithInternal.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Pending Projects
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({pendingProjects.length})
            </span>
          </h3>
          <div className="flex gap-2">
            {totalPendingAmount > 0 && (
              <div className="px-4 py-2 bg-yellow-100 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">
                  Total Pending: ${totalPendingAmount.toFixed(2)}
                </p>
              </div>
            )}
            {pendingProjects.length > 0 && (
              <button
                onClick={() => exportAllProjects(false)}
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                colors={colors}
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
          className="mb-4 flex w-full items-center justify-between rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 text-left transition hover:-translate-y-[1px] card-panel-hover"
        >
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Paid Projects
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({paidProjects.length})
            </span>
          </h3>
          <div className="flex items-center gap-3">
            {paidProjects.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportAllProjects(true);
                }}
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            )}
            <svg
              className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showPaidProjects ? "rotate-180" : ""}`}
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
                    colors={colors}
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
  colors: typeof colors;
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
  colors,
}) => {
  const [showEntries, setShowEntries] = useState(false);

  return (
    <div className="rounded-2xl card-panel p-6 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover">
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-bold text-[var(--color-text-primary)]">{project.projectName}</h4>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                project.isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {project.isPaid ? "Paid" : "Pending"}
            </span>
          </div>
          
          {project.client && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Client: {project.client.name} {project.client.company && `(${project.client.company})`}
            </p>
          )}
          
          {project.description && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{project.description}</p>
          )}

          {project.dateRange && (
            <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">
              📅 {new Date(project.dateRange.startDate).toLocaleDateString()} - {new Date(project.dateRange.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={() => exportProjectToPDF(project)}
            className="rounded-lg bg-[var(--color-surface-3)] p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)]"
            title="Export PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          <button
            onClick={() => markProjectPaid(project.id, !project.isPaid)}
            className={`p-2 transition-colors rounded-lg ${
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
            className="p-2 text-red-600 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
            title="Delete Project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Summary */}
      <div className="mb-4 grid grid-cols-3 gap-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Entries</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{project.entries.length}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Total Hours</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{project.totalHours?.toFixed(1) || 0}h</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Total Pay</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            ${project.totalPay?.toFixed(2) || 0}
          </p>
        </div>
      </div>

      {/* Add Entry Button */}
      <button
        onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}
        className="w-full px-4 py-3 mb-4 text-sm font-semibold transition-all rounded-xl"
        className={activeProjectId === project.id ? "btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold" : "btn-secondary w-full rounded-xl px-4 py-3 text-sm font-semibold"}
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