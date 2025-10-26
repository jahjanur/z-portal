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
      <div className="py-8 text-center bg-gray-50 rounded-xl">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <p className="text-sm font-medium text-gray-700">No domains yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {domains.map((domain) => (
        <div
          key={domain.id}
          className="flex items-center justify-between p-4 transition-colors border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <p className="font-semibold text-gray-900">{domain.domainName}</p>
              {domain.isPrimary && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white rounded-full" style={{ backgroundColor: colors.primary }}>
                  Primary
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Client: {domain.client?.company || domain.client?.name || 'Unknown'}
              {domain.domainExpiry && ` • Domain expires: ${formatDate(domain.domainExpiry)}`}
              {domain.hostingPlan && ` • ${domain.hostingPlan}`}
              {domain.hostingExpiry && ` • Hosting expires: ${formatDate(domain.hostingExpiry)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(domain)}
              className="px-3 py-1.5 text-xs font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
              style={{ backgroundColor: colors.secondary }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(domain.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white transition-opacity bg-red-600 rounded-lg hover:opacity-90"
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