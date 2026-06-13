// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import RoleUser from "../components/Roleuser";
import RoleWorker from "../components/Roleworker";
import { SkeletonDashboard } from "../components/ui/Skeleton";

const Dashboard: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) setRole(storedRole);
  }, []);

  let content: React.ReactNode;
  if (!role) {
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
