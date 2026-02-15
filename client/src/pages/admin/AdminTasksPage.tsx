import React, { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import TaskForm from "../../components/admin/TaskForm";
import TasksList from "../../components/admin/TasksList";

const colors = { primary: "" };

export default function AdminTasksPage() {
  const { clients, workers, projects, activeTasks, completedTasks, createTask, handleCreateProject, deleteTask } = useAdmin();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-4 shadow-xl backdrop-blur-xl sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Tasks Management</h2>
        <TaskForm
          onSubmit={createTask}
          clients={clients}
          workers={workers}
          projects={projects}
          onCreateProject={handleCreateProject}
        />

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
            Active Tasks <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({activeTasks.length})</span>
          </h3>
          {activeTasks.length > 0 ? (
            <TasksList tasks={activeTasks} onDelete={deleteTask} colors={colors} />
          ) : (
            <div className="card-panel py-8 text-center rounded-xl">
              <svg className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No active tasks</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-colors hover:bg-[var(--color-surface-3)]"
          >
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Completed Tasks <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({completedTasks.length})</span>
            </h3>
            <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showCompletedTasks ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCompletedTasks && (
            <div>
              {completedTasks.length > 0 ? (
                <TasksList tasks={completedTasks} onDelete={deleteTask} colors={colors} />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No completed tasks yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
