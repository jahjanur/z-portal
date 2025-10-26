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

  if (!role) return <div>Loading...</div>;
  if (role === "ADMIN") return <RoleAdmin />;
  if (role === "WORKER") return <RoleWorker />;
  if (role === "CLIENT") return <RoleUser />;
  return <div>Unauthorized</div>;
};

export default Dashboard;