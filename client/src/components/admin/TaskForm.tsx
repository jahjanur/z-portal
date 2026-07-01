import { useState } from "react";
import toast from "react-hot-toast";
import { CONTROL_INPUT, CONTROL_SELECT, CONTROL_LABEL, BTN_ACTION } from "../ui/controls";
import WorkerMultiSelect from "../ui/WorkerMultiSelect";
import DatePicker from "../ui/DatePicker";
import Button from "../ui/Button";
import { ServiceTypePicker, ServiceFieldsForm } from "./ServiceFields";
import { getServiceDef } from "../../utils/serviceTypes";
import type { ServiceType } from "../../utils/serviceTypes";

interface User {
  id: number;
  name: string;
  company?: string;
}

interface Project {
  id: number;
  name: string;
  clientId?: number;
  client?: User;
}

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    clientId: string;
    workerIds: number[];
    dueDate: string;
    projectId: string;
  }) => void;
  clients: User[];
  workers: User[];
  projects: Project[];
  onCreateProject: (projectData: {
    name: string;
    clientId: string;
    description: string;
    serviceType?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  hideWorkerAssignment?: boolean;
  /** When true, render without the outer card/title (e.g. inside a modal). */
  embedded?: boolean;
  /** Prefill for edit mode. */
  initialValues?: { title: string; description: string; clientId: string; workerIds: number[]; dueDate: string; projectId: string };
  submitLabel?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  clients,
  workers,
  projects,
  onCreateProject,
  hideWorkerAssignment = false,
  embedded = false,
  initialValues,
  submitLabel,
}) => {
  const [formData, setFormData] = useState(
    initialValues ?? {
      title: "",
      description: "",
      clientId: "",
      workerIds: [] as number[],
      dueDate: "",
      projectId: "",
    }
  );

  const [showProjectForm, setShowProjectForm] = useState(false);
  const emptyProject = {
    name: "",
    clientId: "",
    description: "",
    serviceType: "OTHER" as ServiceType,
    metadata: {} as Record<string, unknown>,
  };
  const [newProject, setNewProject] = useState(emptyProject);

  const handleSubmit = () => {
    if (!formData.title || !formData.clientId) {
      toast.error("Please fill in task title and select a client");
      return;
    }
    onSubmit(formData);
    if (!initialValues) setFormData({ title: "", description: "", clientId: "", workerIds: [], dueDate: "", projectId: "" });
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    await onCreateProject(newProject);
    setNewProject(emptyProject);
    setShowProjectForm(false);
  };

  const filteredProjects = formData.clientId
    ? projects.filter(p => p.clientId?.toString() === formData.clientId || !p.clientId)
    : projects;

  return (
    <div className={embedded ? "relative z-20 overflow-visible" : "card-panel relative z-20 mb-6 overflow-visible p-5 sm:p-6"}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded && <h3 className="section-title !mb-0">Add New Task</h3>}
        <button
          type="button"
          onClick={() => setShowProjectForm(!showProjectForm)}
          className={`${BTN_ACTION} w-full sm:w-auto ${embedded ? "sm:ml-auto" : ""}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Quick Project Creation */}
      {showProjectForm && (
        <div className="mb-5 rounded-2xl border border-[var(--color-border-hover)] bg-[var(--color-surface-2)] p-4 sm:p-5">
          <h4 className="section-title">Create New Project</h4>

          {/* Project type — each type unlocks its own fields below */}
          <div className="mb-4">
            <label className={CONTROL_LABEL}>Project Type</label>
            <ServiceTypePicker
              value={newProject.serviceType}
              onChange={(serviceType) => setNewProject({ ...newProject, serviceType, metadata: {} })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CONTROL_LABEL}>Project Name *</label>
              <input
                placeholder="Project name *"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className={CONTROL_INPUT}
              />
            </div>
            <div>
              <label className={CONTROL_LABEL}>Client</label>
              <select
                value={newProject.clientId}
                onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
                className={CONTROL_SELECT}
              >
                <option value="">No Client (Standalone)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company && `(${c.company})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-full">
              <label className={CONTROL_LABEL}>Description</label>
              <input
                placeholder="Description (optional)"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className={CONTROL_INPUT}
              />
            </div>
          </div>

          {/* Type-specific details (e.g. platforms & budgets for Social Media) */}
          {getServiceDef(newProject.serviceType).fields.length > 0 && (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <label className={CONTROL_LABEL}>{getServiceDef(newProject.serviceType).label} details</label>
              <ServiceFieldsForm
                serviceType={newProject.serviceType}
                metadata={newProject.metadata}
                onChange={(metadata) => setNewProject({ ...newProject, metadata })}
              />
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowProjectForm(false);
                setNewProject(emptyProject);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleCreateProject}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Task Form */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={CONTROL_LABEL}>Task Title *</label>
          <input
            placeholder="Task title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={CONTROL_INPUT}
            required
          />
        </div>
        <div>
          <label className={CONTROL_LABEL}>Description</label>
          <input
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={CONTROL_INPUT}
          />
        </div>
        <div>
          <label className={CONTROL_LABEL}>Client *</label>
          <select
            value={formData.clientId}
            onChange={(e) => {
              setFormData({ ...formData, clientId: e.target.value });
              if (formData.projectId) {
                const selectedProject = projects.find(p => p.id.toString() === formData.projectId);
                if (selectedProject && selectedProject.clientId?.toString() !== e.target.value) {
                  setFormData(prev => ({ ...prev, projectId: "" }));
                }
              }
            }}
            className={CONTROL_SELECT}
            required
          >
            <option value="">Select Client *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={CONTROL_LABEL}>Project</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className={CONTROL_SELECT}
          >
            <option value="">No Project (Standalone)</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.client ? `(${p.client.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        {!hideWorkerAssignment && (
          <div>
            <label className={CONTROL_LABEL}>Workers</label>
            <WorkerMultiSelect
              workers={workers}
              value={formData.workerIds}
              onChange={(workerIds) => setFormData({ ...formData, workerIds })}
              placeholder="Assign workers (optional)"
              autoApply
              usePortal
            />
          </div>
        )}
        <div>
          <label className={CONTROL_LABEL}>Due Date</label>
          <DatePicker
            value={formData.dueDate}
            onChange={(dueDate) => setFormData({ ...formData, dueDate })}
            placeholder="yyyy/mm/dd"
            usePortal
          />
        </div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="primary" onClick={handleSubmit} className="w-full sm:w-auto">
          {submitLabel ?? "Add Task"}
        </Button>
      </div>
    </div>
  );
};

export default TaskForm;
