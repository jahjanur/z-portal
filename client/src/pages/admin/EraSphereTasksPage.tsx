import { useMemo, useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import TasksList from "../../components/admin/TasksList";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { CONTROL_INPUT } from "../../components/ui/controls";

const colors = { primary: "" };

type StatusCategory = "pending" | "in_progress" | "completed";

export default function EraSphereTasksPage() {
  const { tasks, deleteTask, loading } = useAdmin();
  const [statusCategory, setStatusCategory] = useState<StatusCategory>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const erasphereTasks = useMemo(() => {
    let out = tasks.filter((t) => t.client?.referredById != null);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.client?.name?.toLowerCase().includes(q) ||
          t.client?.company?.toLowerCase().includes(q)
      );
    }
    return out;
  }, [tasks, searchQuery]);

  const pendingTasks = useMemo(() => erasphereTasks.filter((t) => t.status === "PENDING"), [erasphereTasks]);
  const inProgressTasks = useMemo(
    () => erasphereTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL"),
    [erasphereTasks]
  );
  const completedTasks = useMemo(() => erasphereTasks.filter((t) => t.status === "COMPLETED"), [erasphereTasks]);

  const currentTasks =
    statusCategory === "pending"
      ? pendingTasks
      : statusCategory === "in_progress"
        ? inProgressTasks
        : completedTasks;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
        <PageHeader title="EraSphere Tasks" subtitle="Tasks for clients referred by EraSphere partners" />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  const filterTabs: { key: StatusCategory; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pendingTasks.length },
    { key: "in_progress", label: "In Progress", count: inProgressTasks.length },
    { key: "completed", label: "Completed", count: completedTasks.length },
  ];

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="EraSphere Tasks"
        subtitle="Tasks for clients referred by EraSphere partners. Create or edit tasks from the main Dashboard → Tasks (filter: EraSphere only)."
      >
        <div className="space-y-4">
          <input
            type="search"
            placeholder="Search tasks by title, description, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${CONTROL_INPUT} w-full sm:max-w-sm`}
          />

          {/* Segmented filter pills — horizontal scroll on mobile */}
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="inline-flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
              {filterTabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusCategory(key)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    statusCategory === key
                      ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="animate-fade-up">
        {currentTasks.length > 0 ? (
          <TasksList tasks={currentTasks} onDelete={deleteTask} colors={colors} />
        ) : (
          <EmptyState
            title={searchQuery ? "No tasks match your search" : "No EraSphere tasks in this category"}
            description={
              searchQuery
                ? "Try a different title, description or client name."
                : "Tasks for EraSphere-referred clients will appear here."
            }
          />
        )}
      </div>
    </div>
  );
}
