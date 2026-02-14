import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

interface User {
  id: number;
  name: string;
  company?: string;
  email: string;
  profileStatus?: string;
}

interface ClientSearchProps {
  clients: User[];
  onDelete: (id: number) => void;
  colors?: { primary: string };
}

const ClientSearch: React.FC<ClientSearchProps> = ({ clients, onDelete }) => {
  const [search, setSearch] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = clients.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleResendInvite = async (clientId: number, email: string) => {
    setResendingId(clientId);
    try {
      await API.post(`/users/${clientId}/resend-invite`);
      alert(`Invite email sent successfully to ${email}`);
    } catch (error) {
      console.error("Error resending invite:", error);
      alert("Failed to resend invite. Please try again.");
    } finally {
      setResendingId(null);
    }
  };

  const isProfileIncomplete = (client: User): boolean => {
    const status = client.profileStatus?.trim().toUpperCase() || "";
    return (
      status === "INCOMPLETE" ||
      status === "PENDING" ||
      status === "" ||
      !client.profileStatus
    );
  };

  return (
    <div className="mb-6">
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 pl-11 rounded-xl border border-border-subtle bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
        />
        <svg
          className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3.5 top-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {search && (
          <div className="absolute z-50 w-full mt-2 overflow-y-auto border border-border-subtle top-full rounded-xl max-h-80 bg-card backdrop-blur-sm shadow-xl">
            {filtered.length > 0 ? (
              <div className="p-2">
                {filtered.map((c) => {
                  const isIncomplete = isProfileIncomplete(c);
                  
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 transition-colors rounded-lg hover:bg-white/10"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          navigate(`/clients/${c.id}`);
                          setSearch("");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{c.name}</p>
                          {isIncomplete && (
                            <span className="px-2 py-0.5 text-xs font-semibold text-amber-400 bg-amber-500/20 rounded-full">
                              Incomplete
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {c.company} • {c.email}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        {/* Only show Resend Invite for INCOMPLETE clients - SAME LOGIC AS CLIENTSLIST */}
                        {isIncomplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendInvite(c.id, c.email);
                            }}
                            disabled={resendingId === c.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border rounded-lg disabled:opacity-50 text-white border-border-medium bg-white/10 hover:bg-white/20"
                            title="Resend invite email"
                          >
                            {resendingId === c.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Resend
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${c.name}?`)) {
                              onDelete(c.id);
                              setSearch("");
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-500/20 rounded-full hover:bg-red-500/30 transition-colors border border-red-500/30"
                          title="Delete client"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400">No clients found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSearch;