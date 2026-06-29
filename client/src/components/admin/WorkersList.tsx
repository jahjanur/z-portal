import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import SkillBadges from "../ui/SkillBadges";
import { avatarGlyph } from "../../constants/workerProfile";

interface User {
  id: number;
  name: string;
  email: string;
  nickname?: string | null;
  avatarEmoji?: string | null;
  skills?: string[];
}

interface WorkersListProps {
  workers: User[];
  onDelete: (id: number) => void;
  canDelete?: boolean;
}

const WorkersList: React.FC<WorkersListProps> = ({ workers, onDelete, canDelete = true }) => {
  if (workers.length === 0) {
    return (
      <EmptyState
        compact
        title="No workers yet"
        description="Invite a worker above to get started."
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="stagger-children min-w-0 max-w-full space-y-3">
      {workers.map((w) => (
        <div
          key={w.id}
          className="card-panel row-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-primary)] ${w.avatarEmoji ? "text-xl" : "text-sm font-medium"}`}>
              {avatarGlyph(w)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--color-text-primary)]">
                {w.name}
                {w.nickname && (
                  <span className="ml-2 text-sm font-medium text-[var(--color-text-muted)]">“{w.nickname}”</span>
                )}
              </p>
              <p className="truncate text-sm text-[var(--color-text-muted)]">{w.email}</p>
              <SkillBadges skills={w.skills} max={5} className="mt-2" />
            </div>
          </div>
          {canDelete && (
            <div className="flex w-full gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
              <Button
                variant="danger"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => onDelete(w.id)}
                aria-label={`Delete worker: ${w.name}`}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
export default WorkersList;
