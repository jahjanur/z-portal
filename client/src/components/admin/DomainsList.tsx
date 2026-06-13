import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

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
  onSetPrimary?: (id: number) => void;
  colors: { primary: string; secondary: string };
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** Semantic tone for domain lifecycle status (badge-success / -warning / -danger / -info). */
const statusTone = (status: string | undefined): BadgeTone => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "danger";
    case "RENEWAL_DUE":
      return "warning";
    case "RENEWED":
      return "info";
    default:
      return "neutral";
  }
};

const DomainsList: React.FC<DomainsListProps> = ({ domains, onEdit, onDelete, onSetPrimary }) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const lifespanLabel = (years: number | null | undefined) => {
    if (years == null) return "—";
    return years === 1 ? "1 year" : `${years} years`;
  };

  if (!Array.isArray(domains) || domains.length === 0) {
    return (
      <EmptyState
        compact
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        }
        title="No domains yet"
        description="Add a domain above to start tracking activations and renewals."
      />
    );
  }

  return (
    <div className="space-y-3 min-w-0 max-w-full stagger-children">
      {domains.map((domain) => {
        const expiry = domain.expirationDate || domain.domainExpiry;
        return (
          <div key={domain.id} className="card-panel row-hover rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 min-w-0 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-text-primary)] break-words">{domain.domainName}</p>
                  {domain.isPrimary && <span className="badge">Primary</span>}
                  {domain.status && (
                    <StatusBadge tone={statusTone(domain.status)}>
                      {domain.status.replace(/_/g, " ")}
                    </StatusBadge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)] sm:grid-cols-2 lg:grid-cols-4">
                  <span>Client: {domain.client?.company || domain.client?.name || "Unknown"}</span>
                  <span>Activation: {formatDate(domain.activationDate)}</span>
                  <span>Expiration: {formatDate(expiry)}</span>
                  <span>Lifespan: {lifespanLabel(domain.lifespanYears)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0 text-xs text-[var(--color-text-muted)]">
                  <span>
                    Renewal reminder: {domain.renewalReminderSentAt ? `Sent ${formatDate(domain.renewalReminderSentAt)}` : "Not sent"}
                  </span>
                  <span>
                    Activation email: {domain.activationEmailSentAt ? "Sent" : "Not sent"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
                {onSetPrimary && !domain.isPrimary && (
                  <Button variant="secondary" size="sm" onClick={() => onSetPrimary(domain.id)} className="flex-1 sm:flex-none">
                    Set Primary
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onEdit(domain)} className="flex-1 sm:flex-none">
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(domain.id)} className="flex-1 sm:flex-none">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DomainsList;
