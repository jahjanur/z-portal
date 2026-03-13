import { useEffect, useState } from "react";
import API from "../api";

export interface WorkspaceOverview {
  workers: number;
  clients: number;
  activeTasks: number;
  unpaidInvoices: number;
  domainsExpiringSoon: number;
  domainsExpiringInOneWeek: number;
  domainsExpiringInTwoWeeks: number;
  domainsExpiringIn30Days: number;
  workersWithIncompleteTasks: number;
}

export function useWorkspaceOverview() {
  const [data, setData] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    API.get<WorkspaceOverview>("/workspace/overview")
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
