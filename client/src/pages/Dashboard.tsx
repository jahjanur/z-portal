// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import RoleUser from "../components/Roleuser";
import RoleWorker from "../components/Roleworker";
import { SkeletonDashboard } from "../components/ui/Skeleton";

/** Read the current role synchronously from storage (single source of truth). */
const readRole = (): string | null => localStorage.getItem("role");

const Dashboard: React.FC = () => {
  // Initialise synchronously so the correct role view renders on first paint —
  // avoids a skeleton flash and a stale/null role right after login.
  const [role, setRole] = useState<string | null>(readRole);

  // Keep role in sync if it changes in another tab or after a re-login.
  useEffect(() => {
    const sync = () => setRole(readRole());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  let content: React.ReactNode;
  if (role === null) {
    content = <SkeletonDashboard />;
  } else if (role === "WORKER") {
    content = <RoleWorker />;
  } else if (role === "CLIENT") {
    content = <RoleUser />;
  } else {
    content = (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Unauthorized</p>
      </div>
    );
  }

  return (
    // pt-24 clears the fixed h-16 navbar with breathing room
    <div className="mx-auto w-full max-w-[1400px] min-w-0 px-4 py-6 pt-24 sm:px-6 lg:px-8">
      {content}
    </div>
  );
};

export default Dashboard;
