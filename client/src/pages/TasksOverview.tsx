import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "PENDING_APPROVAL";
  dueDate?: string;
  createdAt: string;
  client?: { name: string; id: number };
  worker?: { name: string; id: number };
}

const colors = {
  primary: "#5B4FFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export default function TasksOverview() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "pending" | "pending_approval">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await API.get<Task[]>("/tasks");
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "PENDING_APPROVAL":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-400 border-gray-200";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && task.status === "COMPLETED") ||
      (filter === "in_progress" && task.status === "IN_PROGRESS") ||
      (filter === "pending" && task.status === "PENDING") ||
      (filter === "pending_approval" && task.status === "PENDING_APPROVAL");

    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.worker?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter(t => t.status === "PENDING").length;
  const pendingApprovalCount = tasks.filter(t => t.status === "PENDING_APPROVAL").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.success, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.warning, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-400">Loading tasks...</span>
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
            className="p-2 transition-colors rounded-lg border border-border-subtle bg-card hover:bg-white/10"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">
              Task <span style={{ color: colors.primary }}>Overview</span>
            </h1>
            <p className="mt-2 text-gray-400">Monitor task progress and completion rates</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="p-6 rounded-2xl border border-border-subtle bg-card backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-400">Completion Rate</p>
              <div className="p-2 rounded-lg bg-green-50">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
            <p className="mt-2 text-sm text-gray-500">{completedCount} of {tasks.length}</p>
          </div>

          <div className="p-6 rounded-2xl border border-border-subtle bg-card backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold text-gray-400">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completedCount}</p>
          </div>

          <div className="p-6 rounded-2xl border border-border-subtle bg-card backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold text-gray-400">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
          </div>

          <div className="p-6 rounded-2xl border border-border-subtle bg-card backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold text-gray-400">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          </div>

          <div className="p-6 rounded-2xl border border-border-subtle bg-card backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold text-gray-400">Need Approval</p>
            <p className="text-3xl font-bold text-purple-600">{pendingApprovalCount}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 p-6 mb-6 rounded-2xl border border-border-subtle bg-card md:flex-row md:items-center md:justify-between rounded-2xl">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "all" ? "text-white" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
              style={filter === "all" ? { backgroundColor: colors.primary } : {}}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "completed" ? "text-white bg-green-600" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setFilter("in_progress")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "in_progress" ? "text-white bg-blue-600" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "pending" ? "text-white bg-amber-600" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter("pending_approval")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === "pending_approval" ? "text-white bg-purple-600" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Approval ({pendingApprovalCount})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
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

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-4 p-6 transition-all rounded-2xl border border-border-subtle bg-card cursor-pointer md:flex-row md:items-center md:justify-between rounded-2xl hover:shadow-lg hover:border-gray-300"
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">{task.title}</h3>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>

                {task.description && (
                  <p className="mb-3 text-sm text-gray-400 line-clamp-2">{task.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  {task.client && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{task.client.name}</span>
                    </div>
                  )}

                  {task.worker && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{task.worker.name}</span>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Due {formatDate(task.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="py-12 text-center rounded-2xl border border-border-subtle bg-card">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-gray-400">No tasks found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}