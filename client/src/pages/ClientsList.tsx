import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
  profileStatus?: string; // Keep as string for flexibility
  createdAt: string;
  phoneNumber?: string;
  postalAddress?: string;
  role?: string;
}

export default function ClientsList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingInviteId, setSendingInviteId] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await API.get("/users");
      const clientData = response.data.filter((u: Client) => u.role === "CLIENT");
      setClients(clientData);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const resendInvite = async (clientId: number) => {
    setSendingInviteId(clientId);
    try {
      await API.post(`/users/${clientId}/resend-invite`);
      alert("Invite sent successfully!");
    } catch (err) {
      console.error("Error resending invite:", err);
      alert("Failed to send invite.");
    } finally {
      setSendingInviteId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filteredClients = clients.filter((client) => {
    const normalizedStatus = client.profileStatus?.trim().toLowerCase() || "";
    const matchesFilter =
      filter === "all" ||
      (filter === "complete" && normalizedStatus.includes("complete")) ||
      (filter === "incomplete" && normalizedStatus.includes("incomplete"));

    const matchesSearch =
      !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const completeCount = clients.filter(c =>
    (c.profileStatus?.trim().toLowerCase() || "").includes("complete")
  ).length;
  const incompleteCount = clients.filter(c =>
    (c.profileStatus?.trim().toLowerCase() || "").includes("incomplete")
  ).length;

  const cardClass = "rounded-2xl border border-border-subtle bg-card backdrop-blur-sm";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce bg-white/80" />
            <div className="w-3 h-3 rounded-full animate-bounce bg-white/60" style={{ animationDelay: "0.1s" }} />
            <div className="w-3 h-3 rounded-full animate-bounce bg-white/40" style={{ animationDelay: "0.2s" }} />
          </div>
          <span className="text-lg font-medium text-gray-400">Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-app md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 transition-colors rounded-full border border-border-subtle bg-card hover:bg-white/10"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">
              Active <span className="text-gray-400">Clients</span>
            </h1>
            <p className="mt-2 text-gray-400">Manage all your client accounts and profiles</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
          <div className={`p-6 ${cardClass}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Total Clients</p>
              <div className="p-2 rounded-lg bg-white/10">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{clients.length}</p>
          </div>

          <div className={`p-6 ${cardClass}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Complete Profiles</p>
              <div className="p-2 rounded-lg bg-white/10">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400">{completeCount}</p>
            <p className="mt-2 text-sm text-gray-500">
              {clients.length > 0 ? Math.round((completeCount / clients.length) * 100) : 0}% completion rate
            </p>
          </div>

          <div className={`p-6 ${cardClass}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Incomplete Profiles</p>
              <div className="p-2 rounded-lg bg-white/10">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400">{incompleteCount}</p>
            <p className="mt-2 text-sm text-gray-500">Need to complete onboarding</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className={`flex flex-col gap-4 p-6 mb-6 md:flex-row md:items-center md:justify-between ${cardClass}`}>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                filter === "all" ? "bg-white text-app" : "text-gray-400 border border-border-subtle bg-card hover:bg-white/10 hover:text-white"
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setFilter("complete")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                filter === "complete" ? "bg-green-500 text-white" : "text-gray-400 border border-border-subtle bg-card hover:bg-white/10 hover:text-white"
              }`}
            >
              Complete ({completeCount})
            </button>
            <button
              onClick={() => setFilter("incomplete")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                filter === "incomplete" ? "bg-amber-500 text-white" : "text-gray-400 border border-border-subtle bg-card hover:bg-white/10 hover:text-white"
              }`}
            >
              Incomplete ({incompleteCount})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 text-sm bg-white text-gray-900 border border-gray-300 rounded-xl md:w-64 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <svg className="absolute w-5 h-5 text-gray-500 transform -translate-y-1/2 left-3 top-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const normalizedStatus = client.profileStatus?.trim().toLowerCase() || "";

            return (
              <div
                key={client.id}
                className={`p-6 transition-all cursor-pointer rounded-2xl border border-border-subtle bg-card backdrop-blur-sm hover:border-white/15`}
                onClick={() => navigate("/dashboard", { state: { activeTab: "clients" } })}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full bg-white/20">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{client.name}</h3>
                      <p className="text-xs text-gray-500">{client.company || "No company"}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      normalizedStatus.includes("complete")
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {client.profileStatus || "Unknown"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{client.email}</span>
                  </div>

                  {client.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{client.phoneNumber}</span>
                    </div>
                  )}

                  {client.postalAddress && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{client.postalAddress}</span>
                    </div>
                  )}

                  {/* Resend Invite Button for INCOMPLETE clients */}
                  {normalizedStatus.includes("incomplete") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resendInvite(client.id);
                      }}
                      className="px-3 py-1.5 mt-2 text-xs font-semibold rounded-full bg-white text-app hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={sendingInviteId === client.id}
                    >
                      {sendingInviteId === client.id ? "Sending..." : "Resend Invite"}
                    </button>
                  )}

                  <div className="pt-3 mt-3 border-t border-border-subtle">
                    <p className="text-xs text-gray-500">Joined {formatDate(client.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredClients.length === 0 && (
            <div className="col-span-full">
              <div className="py-12 text-center rounded-2xl border border-border-subtle bg-card">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-400">No clients found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}