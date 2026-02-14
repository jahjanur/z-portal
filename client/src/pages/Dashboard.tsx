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
    <div className="flex items-center justify-center min-h-[60vh] bg-app">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/80 animate-bounce" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    </div>
  );
  if (role === "ADMIN") return <RoleAdmin />;
  if (role === "WORKER") return <RoleWorker />;
  if (role === "CLIENT") return <RoleUser />;
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-app">
      <p className="text-gray-400">Unauthorized</p>
    </div>
  );
};

export default Dashboard;