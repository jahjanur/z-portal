import React, { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import ClientSearch from "../../components/admin/ClientSearch";
import ClientForm from "../../components/admin/ClientForm";
import ListDisplay from "../../components/admin/ListDisplay";

const colors = { primary: "", secondary: "#374151", accent: "#6B7280", light: "#F8F9FA", dark: "#1A1A2E" };

export default function AdminClientsPage() {
  const {
    clients,
    incompleteClients,
    completeClients,
    createClient,
    deleteUser,
    resendInvite,
  } = useAdmin();
  const [showCompletedProfiles, setShowCompletedProfiles] = useState(false);

  return (
    <div className="mx-auto max-w-[1200px]">
      <ClientSearch clients={clients} onDelete={deleteUser} colors={colors} />
      <div className="mt-6 rounded-2xl card-panel p-6 shadow-xl backdrop-blur-xl">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Clients Management</h2>
        <ClientForm onSubmit={createClient} colors={colors} />

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
            Incomplete Profiles <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({incompleteClients.length})</span>
          </h3>
          {incompleteClients.length > 0 ? (
            <ListDisplay
              items={incompleteClients}
              onDelete={deleteUser}
              onResendInvite={resendInvite}
              showProfileStatus
              getProfileStatus={(c) => c.profileStatus}
              renderItem={(c) => (
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{c.company} • {c.email}</p>
                  {c.postalAddress && <p className="mt-1 text-xs text-[var(--color-text-muted)]">📍 {c.postalAddress}</p>}
                </div>
              )}
            />
          ) : (
            <div className="card-panel py-8 text-center rounded-xl">
              <svg className="mx-auto mb-3 h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">All profiles are complete! 🎉</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowCompletedProfiles(!showCompletedProfiles)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left transition-colors hover:bg-[var(--color-surface-3)]"
          >
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Complete Profiles <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({completeClients.length})</span>
            </h3>
            <svg className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform ${showCompletedProfiles ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCompletedProfiles && (
            <div>
              {completeClients.length > 0 ? (
                <ListDisplay
                  items={completeClients}
                  onDelete={deleteUser}
                  showProfileStatus
                  getProfileStatus={(c) => c.profileStatus}
                  renderItem={(c) => (
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{c.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{c.company} • {c.email}</p>
                      {c.postalAddress && <p className="mt-1 text-xs text-[var(--color-text-muted)]">📍 {c.postalAddress}</p>}
                    </div>
                  )}
                />
              ) : (
                <p className="rounded-xl bg-[var(--color-surface-2)] py-4 text-center text-sm text-[var(--color-text-muted)]">No complete profiles yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
