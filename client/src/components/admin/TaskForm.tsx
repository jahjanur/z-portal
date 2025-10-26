import { useState } from "react";

interface User {
  id: number;
  name: string;
}

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    clientId: string;
    workerId: string;
    dueDate: string;
  }) => void;
  clients: User[];
  workers: User[];
  colors: { primary: string };
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, clients, workers, colors }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    workerId: "",
    dueDate: "",
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.clientId) {
      alert("Please fill in task title and select a client");
      return;
    }
    onSubmit(formData);
    setFormData({ title: "", description: "", clientId: "", workerId: "", dueDate: "" });
  };

  return (
    <div className="p-5 mb-6 border border-gray-200 bg-gray-50 rounded-xl">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Add New Task</h3>
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
          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
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
        <button
          onClick={handleSubmit}
          className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: colors.primary }}
        >
          Add Task
        </button>
      </div>
    </div>
  );
};

export default TaskForm;