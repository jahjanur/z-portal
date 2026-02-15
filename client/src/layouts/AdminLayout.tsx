import React from "react";
import { Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";

function AdminLayoutInner() {
  const { loading, error } = useAdmin();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-80" />
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.1s" }} />
            <div className="h-3 w-3 rounded-full animate-bounce bg-[var(--color-text-muted)] opacity-40" style={{ animationDelay: "0.2s" }} />
          </div>
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
        <div className="max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6">
          <p className="mb-2 font-semibold text-[var(--color-destructive-text)]">Error</p>
          <p className="text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-transparent py-6">
      <Outlet />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <div className="flex min-h-screen flex-col bg-transparent pt-16">
        <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 sm:px-6 lg:px-8">
          <AdminLayoutInner />
        </main>
      </div>
    </AdminProvider>
  );
}
