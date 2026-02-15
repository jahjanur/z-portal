import { useState } from "react";
import { CONTROL_INPUT, CONTROL_SELECT } from "../ui/controls";
import WorkerMultiSelect from "../ui/WorkerMultiSelect";

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
  onCreateProject: (projectData: { name: string; clientId: string; description: string }) => Promise<void>;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  onSubmit, 
  clients, 
  workers, 
  projects,
  onCreateProject,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    workerIds: [] as number[],
    dueDate: "",
    projectId: "",
  });

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    clientId: "",
    description: "",
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.clientId) {
      alert("Please fill in task title and select a client");
      return;
    }
    onSubmit(formData);
    setFormData({ title: "", description: "", clientId: "", workerIds: [], dueDate: "", projectId: "" });
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      alert("Project name is required");
      return;
    }
    await onCreateProject(newProject);
    setNewProject({ name: "", clientId: "", description: "" });
    setShowProjectForm(false);
  };

  const filteredProjects = formData.clientId
    ? projects.filter(p => p.clientId?.toString() === formData.clientId || !p.clientId)
    : projects;

  return (
    <div className="mb-6 rounded-xl card-panel p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-theme-primary">Add New Task</h3>
        <button
          type="button"
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="btn-primary flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Quick Project Creation */}
      {showProjectForm && (
        <div className="mb-4 rounded-xl border-2 border-[var(--color-border-hover)] card-panel p-4">
          <h4 className="mb-3 text-xs font-semibold text-theme-primary">Create New Project</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              placeholder="Project name *"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="input-dark w-full px-3 py-2 text-xs rounded-lg"
            />
            <select
              value={newProject.clientId}
              onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
              className="input-dark w-full px-3 py-2 text-xs rounded-lg"
            >
              <option value="">No Client (Standalone)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company && `(${c.company})`}
                </option>
              ))}
            </select>
            <input
              placeholder="Description (optional)"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="input-dark w-full px-3 py-2 text-xs rounded-lg"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleCreateProject}
              className="btn-primary px-3 py-1.5 text-xs rounded-lg"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowProjectForm(false);
                setNewProject({ name: "", clientId: "", description: "" });
              }}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Form */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <input
          placeholder="Task title *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={CONTROL_INPUT}
          required
        />
        <input
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={CONTROL_INPUT}
        />
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
        <WorkerMultiSelect
          workers={workers}
          value={formData.workerIds}
          onChange={(workerIds) => setFormData({ ...formData, workerIds })}
          placeholder="Assign workers (optional)"
          autoApply
        />
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className={CONTROL_INPUT}
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        className="btn-primary mt-3 flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm"
      >
        Add Task
      </button>
    </div>
  );
};

export default TaskForm;