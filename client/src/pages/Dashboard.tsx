// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import RoleAdmin from "../components/Roleadmin";
import RoleUser from "../components/Roleuser";
import RoleWorker from "../components/Roleworker";

const Dashboard: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) setRole(storedRole);
  }, []);

  if (!role) return (
    <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce opacity-80" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce opacity-60" style={{ animationDelay: "0.1s" }} />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)] animate-bounce opacity-40" style={{ animationDelay: "0.2s" }} />
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">Loading...</span>
      </div>
    </div>
  );
  if (role === "ADMIN") return <RoleAdmin />;
  if (role === "WORKER") return <RoleWorker />;
  if (role === "CLIENT") return <RoleUser />;
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
      <p className="text-[var(--color-text-muted)]">Unauthorized</p>
    </div>
  );
};

export default Dashboard;