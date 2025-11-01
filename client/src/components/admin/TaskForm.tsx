import { useState } from "react";

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
    workerId: string;
    dueDate: string;
    projectId: string;
  }) => void;
  clients: User[];
  workers: User[];
  projects: Project[];
  onCreateProject: (projectData: { name: string; clientId: string; description: string }) => Promise<void>;
  colors: { primary: string };
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  onSubmit, 
  clients, 
  workers, 
  projects,
  onCreateProject,
  colors 
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    workerId: "",
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
    setFormData({ title: "", description: "", clientId: "", workerId: "", dueDate: "", projectId: "" });
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
    <div className="p-5 mb-6 border border-gray-200 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Add New Task</h3>
        <button
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Quick Project Creation */}
      {showProjectForm && (
        <div className="p-4 mb-4 border-2 border-purple-200 bg-purple-50 rounded-xl">
          <h4 className="mb-3 text-xs font-semibold text-gray-700">Create New Project</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              placeholder="Project name *"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
            />
            <select
              value={newProject.clientId}
              onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
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
              className="px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateProject}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
              style={{ backgroundColor: colors.primary }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowProjectForm(false);
                setNewProject({ name: "", clientId: "", description: "" });
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
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
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
          required
        />
        <input
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
        />
        <select
          value={formData.clientId}
          onChange={(e) => {
            setFormData({ ...formData, clientId: e.target.value });
            // Reset project if client changes
            if (formData.projectId) {
              const selectedProject = projects.find(p => p.id.toString() === formData.projectId);
              if (selectedProject && selectedProject.clientId?.toString() !== e.target.value) {
                setFormData(prev => ({ ...prev, projectId: "" }));
              }
            }
          }}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
          required
        >
          <option value="">Select Client *</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        
        {/* Project Dropdown */}
        <select
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
        >
          <option value="">No Project (Standalone)</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.client ? `(${p.client.name})` : ''}
            </option>
          ))}
        </select>
        
        <select
          value={formData.workerId}
          onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
        >
          <option value="">Assign Worker (Optional)</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2.5 mt-3 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
        style={{ backgroundColor: colors.primary }}
      >
        Add Task
      </button>
    </div>
  );
};

export default TaskForm;