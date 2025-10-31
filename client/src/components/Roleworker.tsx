import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

interface Client {
  id: number;
  name: string;
  company?: string | null;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  clientId: number;
  status?: string | null;
  dueDate?: string | null;
  createdAt: string;
  client?: Client;
}

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  dark: "#1A1A2E",
  light: "#F8F9FA",
};

const RoleWorker: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get<Task[]>("/tasks");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string | null) => {
    if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const completedTasks = tasks.filter(t => t.status?.toUpperCase() === "COMPLETED").length;
  const inProgressTasks = tasks.filter(t => t.status?.toUpperCase() === "IN_PROGRESS").length;
  const pendingTasks = tasks.filter(t => t.status?.toUpperCase() === "PENDING").length;
  const overdueTasks = tasks.filter(t => {
    const days = getDaysUntilDue(t.dueDate);
    return days !== null && days < 0 && t.status?.toUpperCase() !== "COMPLETED";
  }).length;

  const upcomingTasks = tasks.filter(t => {
    const days = getDaysUntilDue(t.dueDate);
    return days !== null && days >= 0 && days <= 7 && t.status?.toUpperCase() !== "COMPLETED";
  }).length;

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "ALL" || task.status?.toUpperCase() === statusFilter;
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading your tasks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <p className="mb-2 text-lg font-semibold text-red-800">Error:</p>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 mt-4 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            My <span style={{ color: colors.primary }}>Tasks</span>
          </h1>
          <p className="text-lg text-gray-600">Track and manage your assigned tasks</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {(["overview", "tasks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? "text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200"
                }`}
                style={activeTab === tab ? { backgroundColor: colors.primary } : {}}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Tasks */}
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-600">Total Tasks</p>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
                    <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
                <p className="mt-2 text-sm text-gray-500">{completedTasks} completed</p>
              </div>

              {/* Active Tasks */}
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-600">In Progress</p>
                  <div className="p-2 rounded-lg bg-blue-50">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-600">{inProgressTasks}</p>
                <p className="mt-2 text-sm text-gray-500">Active work</p>
              </div>

              {/* Overdue Tasks */}
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-600">Overdue</p>
                  <div className="p-2 rounded-lg bg-red-50">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{overdueTasks}</p>
                <p className="mt-2 text-sm text-gray-500">Need attention</p>
              </div>

              {/* Upcoming Tasks */}
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-600">Due This Week</p>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.accent}15` }}>
                    <svg className="w-5 h-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: colors.accent }}>{upcomingTasks}</p>
                <p className="mt-2 text-sm text-gray-500">Next 7 days</p>
              </div>
            </div>

            {/* Task Progress */}
            <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Task Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                    <span className="text-sm font-bold text-green-600">{completedTasks} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                    <div 
                      className="h-full transition-all duration-500 bg-green-500 rounded-full"
                      style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">In Progress</span>
                    <span className="text-sm font-bold text-blue-600">{inProgressTasks} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                    <div 
                      className="h-full transition-all duration-500 bg-blue-500 rounded-full"
                      style={{ width: `${tasks.length > 0 ? (inProgressTasks / tasks.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                    <span className="text-sm font-bold text-amber-600">{pendingTasks} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                    <div 
                      className="h-full transition-all duration-500 rounded-full bg-amber-500"
                      style={{ width: `${tasks.length > 0 ? (pendingTasks / tasks.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent & Priority Tasks */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Overdue Tasks */}
              {overdueTasks > 0 && (
                <div className="p-6 bg-white border border-red-200 shadow-sm rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">Overdue Tasks</h3>
                  </div>
                  <div className="space-y-3">
                    {tasks
                      .filter(t => {
                        const days = getDaysUntilDue(t.dueDate);
                        return days !== null && days < 0 && t.status?.toUpperCase() !== "COMPLETED";
                      })
                      .slice(0, 5)
                      .map((task) => {
                        const daysUntil = getDaysUntilDue(task.dueDate);
                        
                        return (
                          <div
                            key={task.id}
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="p-4 transition-all border border-red-200 rounded-lg cursor-pointer bg-red-50 hover:shadow-md hover:border-red-300"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                <p className="text-sm text-gray-500">{task.client?.name || "No client"}</p>
                                <p className="mt-1 text-xs font-semibold text-red-600">
                                  Overdue by {Math.abs(daysUntil!)} days
                                </p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                                {task.status?.replace("_", " ") || "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Recent Tasks */}
              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Tasks</h3>
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => {
                    const daysUntil = getDaysUntilDue(task.dueDate);
                    const isOverdue = daysUntil !== null && daysUntil < 0 && task.status?.toUpperCase() !== "COMPLETED";
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="p-4 transition-all border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:border-gray-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-500">{task.client?.name || "No client"}</p>
                            {isOverdue && (
                              <p className="mt-1 text-xs font-semibold text-red-600">Overdue by {Math.abs(daysUntil!)} days</p>
                            )}
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                            {task.status?.replace("_", " ") || "N/A"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <p className="py-8 text-center text-gray-500">No tasks yet</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="w-full px-4 py-2 mt-4 text-sm font-semibold text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  View All Tasks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      statusFilter === status
                        ? "text-white"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                    }`}
                    style={statusFilter === status ? { backgroundColor: colors.primary } : {}}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              />
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center bg-white border border-gray-200 rounded-2xl">
                  <p className="text-lg font-medium text-gray-700">No tasks found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const daysUntil = getDaysUntilDue(task.dueDate);
                  const isOverdue = daysUntil !== null && daysUntil < 0 && task.status?.toUpperCase() !== "COMPLETED";
                  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="p-6 transition-all bg-white border border-gray-200 shadow-sm cursor-pointer rounded-2xl hover:shadow-md hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="mb-2 text-xl font-bold text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="mb-3 text-sm text-gray-600">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {task.client && (
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium">{task.client.name}</span>
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-2 ${
                                  isOverdue
                                    ? "text-red-600 font-semibold"
                                    : isDueSoon
                                    ? "text-amber-600 font-semibold"
                                    : ""
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>
                                  {isOverdue
                                    ? `Overdue by ${Math.abs(daysUntil!)} days`
                                    : isDueSoon
                                    ? `Due in ${daysUntil} days`
                                    : `Due: ${formatDate(task.dueDate)}`}
                                </span>
                              </span>
                            )}
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Created: {formatDate(task.createdAt)}</span>
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status?.replace("_", " ") || "N/A"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleWorker;