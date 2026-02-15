import React from "react";
import { useAdmin } from "../../contexts/AdminContext";
import WorkerForm from "../../components/admin/WorkerForm";
import WorkersList from "../../components/admin/WorkersList";

export default function AdminWorkersPage() {
  const { workers, createWorker, deleteUser } = useAdmin();

  return (
    <div className="mx-auto max-w-[1200px]">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Workers Management</h2>
      <div className="rounded-2xl card-panel p-4 shadow-xl backdrop-blur-xl sm:p-6">
        <WorkerForm onSubmit={createWorker} />
        <WorkersList workers={workers} onDelete={deleteUser} />
      </div>
    </div>
  );
}
