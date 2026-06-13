import { Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { SkeletonDashboard } from "../components/ui/Skeleton";

function AdminLayoutInner() {
  const { loading, error } = useAdmin();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
        <div className="max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6">
          <p className="mb-2 font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="text-sm text-[var(--color-destructive-text)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden bg-transparent py-6 lg:py-8">
      <Outlet />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-transparent pt-16">
        <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-x-hidden px-4 sm:px-6 lg:px-8">
          <AdminLayoutInner />
        </main>
      </div>
    </AdminProvider>
  );
}
