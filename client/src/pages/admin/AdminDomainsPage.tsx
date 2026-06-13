import { useAdmin } from "../../contexts/AdminContext";
import DomainForm from "../../components/admin/DomainForm";
import DomainsList from "../../components/admin/DomainsList";
import PageHeader from "../../components/ui/PageHeader";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

export default function AdminDomainsPage() {
  const { clients, domains, adminOwnClients, adminOwnDomains, editingDomain, createDomain, updateDomain, setPrimaryDomain, deleteDomain, handleEditDomain, handleCancelEdit } = useAdmin();
  const isAdmin = localStorage.getItem("role") === "ADMIN";

  const displayClients = isAdmin ? adminOwnClients : clients;
  const displayDomains = isAdmin ? adminOwnDomains : domains;

  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="Domains"
        subtitle="Register, renew and manage client domains"
      />

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
          <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">
            ({displayDomains.length})
          </span>
        </h3>
        <DomainsList domains={displayDomains} onEdit={handleEditDomain} onDelete={deleteDomain} onSetPrimary={setPrimaryDomain} colors={colors} />
      </section>
    </div>
  );
}
