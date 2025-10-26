import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
  profileStatus?: "COMPLETE" | "INCOMPLETE";
  createdAt: string;
  phoneNumber?: string;
  postalAddress?: string;
  role?: string;
}

const colors = {
  primary: "#5B4FFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function ClientsList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredClients = clients.filter((client) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "complete" && client.profileStatus === "COMPLETE") ||
      (filter === "incomplete" && client.profileStatus === "INCOMPLETE");

    const matchesSearch =
      !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const completeCount = clients.filter(c => c.profileStatus === "COMPLETE").length;
  const incompleteCount = clients.filter(c => c.profileStatus === "INCOMPLETE").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.success, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.warning, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-gray-50 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Active <span style={{ color: colors.primary }}>Clients</span>
            </h1>
            <p className="mt-2 text-gray-600">Manage all your client accounts and profiles</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Total Clients</p>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>{clients.length}</p>
          </div>

          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Complete Profiles</p>
              <div className="p-2 rounded-lg bg-green-50">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{completeCount}</p>
            <p className="mt-2 text-sm text-gray-500">
              {clients.length > 0 ? Math.round((completeCount / clients.length) * 100) : 0}% completion rate
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Incomplete Profiles</p>
              <div className="p-2 rounded-lg bg-amber-50">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600">{incompleteCount}</p>
            <p className="mt-2 text-sm text-gray-500">Need to complete onboarding</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 p-6 mb-6 bg-white border border-gray-200 shadow-sm md:flex-row md:items-center md:justify-between rounded-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "all" ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
              style={filter === "all" ? { backgroundColor: colors.primary } : {}}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setFilter("complete")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "complete" ? "text-white bg-green-600" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Complete ({completeCount})
            </button>
            <button
              onClick={() => setFilter("incomplete")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "incomplete" ? "text-white bg-amber-600" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
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
              className="w-full px-4 py-2 pl-10 text-sm bg-white border border-gray-200 rounded-lg md:w-64 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
            />
            <svg
              className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="p-6 transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-lg hover:border-gray-300"
              onClick={() => navigate("/dashboard", { state: { activeTab: "clients" } })}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{client.name}</h3>
                    <p className="text-xs text-gray-500">{client.company || "No company"}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    client.profileStatus === "COMPLETE"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {client.profileStatus || "Unknown"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{client.email}</span>
                </div>

                {client.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{client.phoneNumber}</span>
                  </div>
                )}

                {client.postalAddress && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{client.postalAddress}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Joined {formatDate(client.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}

          {filteredClients.length === 0 && (
            <div className="col-span-full">
              <div className="py-12 text-center bg-white border border-gray-200 rounded-2xl">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">No clients found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}