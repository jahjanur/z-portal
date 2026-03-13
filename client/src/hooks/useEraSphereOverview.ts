import { useEffect, useState } from "react";
import API from "../api";

export interface EraSphereOverview {
  partners: number;
  referredClients: number;
  activeTasks: number;
  completedTasks: number;
  totalTasks: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export function useEraSphereOverview() {
  const [data, setData] = useState<EraSphereOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    API.get<EraSphereOverview>("/workspace/erasphere-overview")
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
