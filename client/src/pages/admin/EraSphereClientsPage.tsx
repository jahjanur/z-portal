import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../contexts/AdminContext";

export default function EraSphereClientsPage() {
  const { clients, loading } = useAdmin();
  const [search, setSearch] = useState("");

  const erasphereClients = useMemo(() => {
    const list = clients.filter((c) => c.role === "CLIENT" && c.referredById != null);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Clients</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl card-panel p-8">
          <span className="text-[var(--color-text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">EraSphere Clients</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Clients referred by EraSphere partners. Open a client to view tasks, invoices, and details.
      </p>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark w-full max-w-md rounded-xl px-4 py-2.5 text-sm"
        />
      </div>

      <div className="rounded-2xl card-panel p-4 shadow-xl sm:p-6">
        {erasphereClients.length === 0 ? (
          <p className="py-12 text-center text-[var(--color-text-muted)]">
            {clients.some((c) => c.referredById != null) ? "No clients match your search." : "No EraSphere-referred clients yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {erasphereClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{c.company ?? "—"} • {c.email}</p>
                </div>
                <span
                  className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold sm:self-center ${
                    c.profileStatus === "COMPLETE" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {c.profileStatus === "COMPLETE" ? "Complete" : "Incomplete"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
