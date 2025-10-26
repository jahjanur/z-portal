interface User {
  id: number;
  name: string;
  email: string;
}

interface WorkersListProps {
  workers: User[];
  onDelete: (id: number) => void;
}

const WorkersList: React.FC<WorkersListProps> = ({ workers, onDelete }) => {
  return (
    <div className="space-y-2">
      {workers.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{w.name}</p>
            <p className="text-sm text-gray-500">{w.email}</p>
          </div>
          <button
            onClick={() => onDelete(w.id)}
            className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg border border-red-200"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};
export default WorkersList;