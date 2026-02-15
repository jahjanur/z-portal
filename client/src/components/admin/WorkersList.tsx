interface User {
  id: number;
  name: string;
  email: string;
}

interface WorkersListProps {
  workers: User[];
  onDelete: (id: number) => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

const WorkersList: React.FC<WorkersListProps> = ({ workers, onDelete }) => {
  return (
    <div className="space-y-2">
      {workers.map((w) => (
        <div
          key={w.id}
          className="flex items-center gap-4 rounded-lg card-panel p-4 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] text-sm font-medium text-[var(--color-text-primary)]">
            {getInitials(w.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--color-text-primary)]">{w.name}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{w.email}</p>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => onDelete(w.id)}
              className="rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--color-destructive-text)] transition hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
export default WorkersList;