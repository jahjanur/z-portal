import React from "react";
import { useAdmin } from "../../contexts/AdminContext";
import DomainForm from "../../components/admin/DomainForm";
import DomainsList from "../../components/admin/DomainsList";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

export default function AdminDomainsPage() {
  const { clients, domains, editingDomain, createDomain, updateDomain, deleteDomain, handleEditDomain, handleCancelEdit } = useAdmin();

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-6 shadow-xl backdrop-blur-xl">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Domains Management</h2>
        <DomainForm
          onSubmit={createDomain}
          onUpdate={updateDomain}
          clients={clients}
          colors={colors}
          editingDomain={editingDomain}
          onCancelEdit={handleCancelEdit}
        />
        <DomainsList domains={domains} onEdit={handleEditDomain} onDelete={deleteDomain} colors={colors} />
      </div>
    </div>
  );
}
