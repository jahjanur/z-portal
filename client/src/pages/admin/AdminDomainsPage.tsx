import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import DomainForm from "../../components/admin/DomainForm";
import DomainsList from "../../components/admin/DomainsList";
import ServerForm from "../../components/admin/ServerForm";
import ServersList from "../../components/admin/ServersList";
import PageHeader from "../../components/ui/PageHeader";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

export default function AdminDomainsPage() {
  const {
    clients,
    domains,
    servers,
    adminOwnClients,
    adminOwnDomains,
    adminOwnServers,
    editingDomain,
    editingServer,
    createDomain,
    updateDomain,
    setPrimaryDomain,
    deleteDomain,
    handleEditDomain,
    handleCancelEdit,
    createServer,
    updateServer,
    deleteServer,
    handleEditServer,
    handleCancelServerEdit,
  } = useAdmin();
  const isAdmin = localStorage.getItem("role") === "ADMIN";

  const displayClients = isAdmin ? adminOwnClients : clients;
  const displayDomains = isAdmin ? adminOwnDomains : domains;
  const displayServers = isAdmin ? adminOwnServers : servers;

  const [tab, setTab] = useState<"domains" | "servers">("domains");

  const tabs: { key: "domains" | "servers"; label: string; count: number }[] = [
    { key: "domains", label: "Domains", count: displayDomains.length },
    { key: "servers", label: "Servers", count: displayServers.length },
  ];

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader title="Domains & Servers" subtitle="Register, renew and manage client domains and servers" />

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "domains" ? (
        <>
          <DomainForm
            onSubmit={createDomain}
            onUpdate={updateDomain}
            clients={displayClients}
            colors={colors}
            editingDomain={editingDomain}
            onCancelEdit={handleCancelEdit}
          />
          <section className="animate-fade-up">
            <h3 className="section-title mb-4">
              All Domains{" "}
              <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">({displayDomains.length})</span>
            </h3>
            <DomainsList domains={displayDomains} onEdit={handleEditDomain} onDelete={deleteDomain} onSetPrimary={setPrimaryDomain} colors={colors} />
          </section>
        </>
      ) : (
        <>
          <ServerForm
            onSubmit={createServer}
            onUpdate={updateServer}
            clients={displayClients}
            editingServer={editingServer}
            onCancelEdit={handleCancelServerEdit}
          />
          <section className="animate-fade-up">
            <h3 className="section-title mb-4">
              All Servers{" "}
              <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">({displayServers.length})</span>
            </h3>
            <ServersList servers={displayServers} onEdit={handleEditServer} onDelete={deleteServer} />
          </section>
        </>
      )}
    </div>
  );
}
