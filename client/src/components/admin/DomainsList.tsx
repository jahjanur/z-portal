interface Domain {
  id: number;
  domainName: string;
  domainExpiry?: string;
  hostingPlan?: string;
  hostingExpiry?: string;
  isPrimary: boolean;
  client: {
    id: number;
    name: string;
    company?: string;
  };
  createdAt: string;
}

interface DomainsListProps {
  domains: Domain[];
  onEdit: (domain: Domain) => void;
  onDelete: (id: number) => void;
  colors: { primary: string; secondary: string };
}

const DomainsList: React.FC<DomainsListProps> = ({ domains, onEdit, onDelete, colors }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!Array.isArray(domains) || domains.length === 0) {
    return (
      <div className="rounded-xl card-panel py-8 text-center shadow-lg backdrop-blur-md">
        <svg className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No domains yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {domains.map((domain) => (
        <div
          key={domain.id}
          className="flex flex-col gap-2 rounded-xl card-panel p-4 shadow-lg backdrop-blur-md transition hover:-translate-y-[1px] card-panel-hover sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="font-semibold text-[var(--color-text-primary)] break-words">{domain.domainName}</p>
              {domain.isPrimary && (
                <span className="whitespace-nowrap rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]">
                  Primary
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-muted)] break-words">
              Client: {domain.client?.company || domain.client?.name || "Unknown"}
              {domain.domainExpiry && ` • Domain expires: ${formatDate(domain.domainExpiry)}`}
              {domain.hostingPlan && ` • ${domain.hostingPlan}`}
              {domain.hostingExpiry && ` • Hosting expires: ${formatDate(domain.hostingExpiry)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-start sm:flex-nowrap sm:justify-end shrink-0">
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
      ))}
    </div>
  );
};

export default DomainsList;