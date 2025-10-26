import { useState, useEffect } from "react";
import API from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
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

    // Title
    doc.setFontSize(20);
    doc.setTextColor(91, 79, 255);
    doc.text(project.projectName, 14, 20);

    // Project details
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    if (project.client) {
      doc.text(`Client: ${project.client.name}${project.client.company ? ` (${project.client.company})` : ""}`, 14, 34);
    }
    if (project.description) {
      doc.text(`Description: ${project.description}`, 14, 40);
    }

    // Summary box
    const summaryY = project.description ? 48 : 42;
    doc.setFillColor(248, 249, 250);
    doc.rect(14, summaryY, 182, 20, "F");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total Entries: ${project.entries.length}`, 20, summaryY + 8);
    doc.text(`Total Hours: ${project.totalHours?.toFixed(1) || 0}h`, 20, summaryY + 15);
    doc.text(`Total Amount: $${project.totalPay?.toFixed(2) || 0}`, 120, summaryY + 8);
    doc.text(`Status: ${project.isPaid ? "PAID" : "PENDING"}`, 120, summaryY + 15);

    if (project.dateRange) {
      doc.text(
        `Period: ${new Date(project.dateRange.startDate).toLocaleDateString()} - ${new Date(project.dateRange.endDate).toLocaleDateString()}`,
        20,
        summaryY + 22
      );
    }

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

    // Add table
    autoTable(doc, {
      startY: summaryY + 28,
      head: [["Date", "Hours", "Rate", "Total Pay", "Notes"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [91, 79, 255],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25, halign: "right" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 57 },
      },
    });

    // Footer
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
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600"></div>
          <p className="text-sm text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Timesheets Management
      </h2>

      {/* New Project Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-all rounded-xl hover:shadow-lg"
          style={{ background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})` }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="p-6 mb-6 border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 rounded-2xl">
          <h3 className="mb-4 text-lg font-bold text-gray-900">Create New Project</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Website Redesign"
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Client (Optional)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
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
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={createProject}
              className="px-6 py-3 text-sm font-semibold text-white transition-all rounded-xl hover:shadow-md"
              style={{ backgroundColor: colors.primary }}
            >
              Create Project
            </button>
            <button
              onClick={() => {
                setShowNewProjectForm(false);
                setProjectName("");
                setSelectedClientId("");
                setProjectDescription("");
              }}
              className="px-6 py-3 text-sm font-semibold text-gray-700 transition-all bg-gray-200 rounded-xl hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Projects */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Pending Projects
            <span className="ml-2 text-sm font-normal text-gray-500">
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg hover:shadow-md"
                style={{ backgroundColor: colors.primary }}
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
          <div className="py-8 text-center bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-700">No pending projects</p>
          </div>
        )}
      </div>

      {/* Paid Projects */}
      <div className="mt-8">
        <button
          onClick={() => setShowPaidProjects(!showPaidProjects)}
          className="flex items-center justify-between w-full p-4 mb-4 text-left transition-colors bg-gray-50 rounded-xl hover:bg-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900">
            Paid Projects
            <span className="ml-2 text-sm font-normal text-gray-500">
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg hover:shadow-md"
                style={{ backgroundColor: colors.accent }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            )}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showPaidProjects ? "rotate-180" : ""}`}
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
              <p className="py-4 text-sm text-center text-gray-500 bg-gray-50 rounded-xl">
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
    <div className="p-6 transition-all border border-gray-200 shadow-sm bg-gradient-to-br from-white to-gray-50 rounded-2xl hover:shadow-md">
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-bold text-gray-900">{project.projectName}</h4>
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
            <p className="text-sm text-gray-600">
              Client: {project.client.name} {project.client.company && `(${project.client.company})`}
            </p>
          )}
          
          {project.description && (
            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
          )}

          {project.dateRange && (
            <p className="mt-2 text-sm font-medium text-purple-600">
              📅 {new Date(project.dateRange.startDate).toLocaleDateString()} - {new Date(project.dateRange.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={() => exportProjectToPDF(project)}
            className="p-2 text-purple-600 transition-colors rounded-lg bg-purple-50 hover:bg-purple-100"
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
      <div className="grid grid-cols-3 gap-4 p-4 mb-4 border-2 border-purple-200 bg-purple-50 rounded-xl">
        <div>
          <p className="text-xs text-gray-600">Entries</p>
          <p className="text-lg font-bold text-gray-900">{project.entries.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Hours</p>
          <p className="text-lg font-bold text-gray-900">{project.totalHours?.toFixed(1) || 0}h</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Pay</p>
          <p className="text-2xl font-bold" style={{ color: colors.primary }}>
            ${project.totalPay?.toFixed(2) || 0}
          </p>
        </div>
      </div>

      {/* Add Entry Button */}
      <button
        onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}
        className="w-full px-4 py-3 mb-4 text-sm font-semibold transition-all rounded-xl"
        style={{
          backgroundColor: activeProjectId === project.id ? colors.secondary : colors.light,
          color: activeProjectId === project.id ? "white" : colors.dark,
        }}
      >
        {activeProjectId === project.id ? "Cancel" : "+ Add Entry"}
      </button>

      {/* Add Entry Form */}
      {activeProjectId === project.id && (
        <div className="p-4 mb-4 border border-gray-200 bg-gray-50 rounded-xl">
          <h5 className="mb-3 text-sm font-bold text-gray-900">New Entry</h5>
          
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">Hours *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={entryHours || ""}
                onChange={(e) => setEntryHours(Number(e.target.value))}
                placeholder="8.0"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">Rate ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryRate || ""}
                onChange={(e) => setEntryRate(Number(e.target.value))}
                placeholder="70.00"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">Total</label>
              <input
                type="text"
                value={`$${(entryHours * entryRate).toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 text-sm font-bold text-purple-700 bg-gray-100 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="block mb-1 text-xs font-medium text-gray-700">Notes</label>
            <textarea
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          
          <button
            onClick={() => addEntry(project.id)}
            className="w-full px-4 py-2 mt-3 text-sm font-semibold text-white transition-all rounded-lg hover:shadow-md"
            style={{ backgroundColor: colors.primary }}
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
            className="flex items-center justify-between w-full px-4 py-2 mb-2 text-left transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <span className="text-sm font-semibold text-gray-700">
              View Entries ({project.entries.length})
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${showEntries ? "rotate-180" : ""}`}
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
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.hoursWorked}h × ${entry.hourlyRate}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-600">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold" style={{ color: colors.primary }}>
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