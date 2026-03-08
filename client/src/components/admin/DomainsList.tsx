interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  isPrimary: boolean;
  client: { id: number; name: string; company?: string };
  createdAt: string;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  status?: string;
  activationEmailSentAt?: string | null;
  renewalReminderSentAt?: string | null;
}

interface DomainsListProps {
  domains: Domain[];
  onEdit: (domain: Domain) => void;
  onDelete: (id: number) => void;
  colors: { primary: string; secondary: string };
}

const DomainsList: React.FC<DomainsListProps> = ({ domains, onEdit, onDelete }) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const lifespanLabel = (years: number | null | undefined) => {
    if (years == null) return "—";
    return years === 1 ? "1 year" : `${years} years`;
  };

  const statusBadgeClass = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "EXPIRED":
        return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
      case "RENEWAL_DUE":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "RENEWED":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]";
    }
  };

  if (!Array.isArray(domains) || domains.length === 0) {
    return (
      <div className="rounded-xl card-panel py-8 text-center shadow-lg">
        <svg className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No domains yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {domains.map((domain) => {
        const expiry = domain.expirationDate || domain.domainExpiry;
        return (
          <div
            key={domain.id}
            className="flex flex-col gap-3 rounded-xl card-panel p-4 shadow-lg transition hover:-translate-y-[1px] card-panel-hover"
          >
            <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="font-semibold text-[var(--color-text-primary)] break-words">{domain.domainName}</p>
                  {domain.isPrimary && (
                    <span className="whitespace-nowrap rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]">
                      Primary
                    </span>
                  )}
                  {domain.status && (
                    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(domain.status)}`}>
                      {domain.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)] sm:grid-cols-2 lg:grid-cols-4">
                  <span>Client: {domain.client?.company || domain.client?.name || "Unknown"}</span>
                  <span>Activation: {formatDate(domain.activationDate)}</span>
                  <span>Expiration: {formatDate(expiry)}</span>
                  <span>Lifespan: {lifespanLabel(domain.lifespanYears)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-xs text-[var(--color-text-muted)]">
                  <span>
                    Renewal reminder: {domain.renewalReminderSentAt ? `Sent ${formatDate(domain.renewalReminderSentAt)}` : "Not sent"}
                  </span>
                  <span>
                    Activation email: {domain.activationEmailSentAt ? "Sent" : "Not sent"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0 sm:flex-nowrap">
                <button
                  onClick={() => onEdit(domain)}
                  className="h-9 px-3 text-sm font-semibold btn-primary rounded-lg whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(domain.id)}
                  className="h-9 px-3 text-sm font-semibold rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] transition hover:opacity-90 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DomainsList;
