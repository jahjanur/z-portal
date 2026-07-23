import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { formatMoney } from "../../utils/currency";

interface Server {
  id: number;
  label: string;
  provider?: string | null;
  ipAddress?: string | null;
  plan?: string | null;
  location?: string | null;
  client: { id: number; name: string; company?: string };
  createdAt: string;
  activationDate?: string | null;
  expirationDate?: string | null;
  lifespanYears?: number | null;
  price?: number | null;
  providerCost?: number | null;
  currency?: string | null;
  billingCycle?: string | null;
  status?: string;
}

/** Short suffix for a billing cycle, e.g. "/yr". */
const cycleSuffix = (cycle?: string | null) => (cycle === "MONTHLY" ? "/mo" : "/yr");

interface ServersListProps {
  servers: Server[];
  onEdit: (server: Server) => void;
  onDelete: (id: number) => void;
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** Semantic tone for server lifecycle status. */
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

const ServersList: React.FC<ServersListProps> = ({ servers, onEdit, onDelete }) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const lifespanLabel = (years: number | null | undefined) => {
    if (years == null) return "—";
    return years === 1 ? "1 year" : `${years} years`;
  };

  if (!Array.isArray(servers) || servers.length === 0) {
    return (
      <EmptyState
        compact
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        }
        title="No servers yet"
        description="Add a server above to start tracking activations and renewals."
      />
    );
  }

  return (
    <div className="space-y-3 min-w-0 max-w-full stagger-children">
      {servers.map((server) => (
        <div key={server.id} className="card-panel row-hover rounded-xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 min-w-0 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[var(--color-text-primary)] break-words">{server.label}</p>
                {server.status && <StatusBadge tone={statusTone(server.status)}>{server.status.replace(/_/g, " ")}</StatusBadge>}
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)] sm:grid-cols-2 lg:grid-cols-4">
                <span>Client: {server.client?.company || server.client?.name || "Unknown"}</span>
                <span>Provider: {server.provider || "—"}</span>
                <span>IP: {server.ipAddress || "—"}</span>
                <span>Plan: {server.plan || "—"}</span>
                <span>Activation: {formatDate(server.activationDate)}</span>
                <span>Expiration: {formatDate(server.expirationDate)}</span>
                <span>Active for: {lifespanLabel(server.lifespanYears)}</span>
                <span>Location: {server.location || "—"}</span>
              </div>

              {(server.price != null || server.providerCost != null) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {server.price != null && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success-text)]">
                      Charge: {formatMoney(server.price, server.currency)}{cycleSuffix(server.billingCycle)}
                    </span>
                  )}
                  {server.providerCost != null && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                      Cost: {formatMoney(server.providerCost, server.currency)}{cycleSuffix(server.billingCycle)}
                    </span>
                  )}
                  {server.price != null && server.providerCost != null && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                      Margin: {formatMoney(server.price - server.providerCost, server.currency)}{cycleSuffix(server.billingCycle)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
              <Button variant="secondary" size="sm" onClick={() => onEdit(server)} className="flex-1 sm:flex-none">
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(server.id)} className="flex-1 sm:flex-none">
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServersList;
