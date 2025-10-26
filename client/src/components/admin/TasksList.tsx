import { useNavigate } from "react-router-dom";

interface Task {
  id: number;
  title: string;
  clientId: number;
  workerId?: number;
  dueDate?: string;
  status: string;
  client?: { name: string };
  worker?: { name: string };
}

interface TasksListProps {
  tasks: Task[];
  onDelete: (id: number) => void;
}

const TasksList: React.FC<TasksListProps> = ({ tasks, onDelete }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between p-4 transition-shadow bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md"
          onClick={() => navigate(`/tasks/${t.id}`)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <p className="font-semibold text-gray-900">{t.title}</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(t.status)}`}>
                {t.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Client: {t.client?.name || t.clientId} • Worker:{" "}
              {t.worker?.name || "Unassigned"} • Due:{" "}
              {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(t.id);
            }}
            className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default TasksList;