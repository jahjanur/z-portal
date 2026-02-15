import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import AdminStatusControls from "../components/taskdetail/AdminStatusControls";
import WorkerStatusControls from "../components/taskdetail/WorkerStatusControls";
import ClientStatusView from "../components/taskdetail/ClientStatusView";
import FileViewer from "../components/FileViewer";
import WorkerMultiSelect from "../components/ui/WorkerMultiSelect";

const colors = {
  primary: "rgba(255,255,255,0.12)",
};

interface User {
  id: number;
  name: string;
  email: string;
}

interface FileComment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: User;
}

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  section: string | null;
  caption: string | null;
  version: number;
  uploadedAt: string;
  uploadedBy: number;
  comments?: FileComment[];
}

interface TaskComment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: User;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  workers: { user: User }[];
  client: User;
  files: TaskFile[];
  comments: TaskComment[];
}

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  
  const [fileComments, setFileComments] = useState<{ [fileId: number]: string }>({});
  const [addingFileComment, setAddingFileComment] = useState<{ [fileId: number]: boolean }>({});
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSection, setFileSection] = useState("");
  const [fileCaption, setFileCaption] = useState("");
  const [fileType, setFileType] = useState("screenshot");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<TaskFile | null>(null);
  const [workers, setWorkers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [savingWorkers, setSavingWorkers] = useState(false);

  const currentUserId = parseInt(localStorage.getItem("userId") || "0");
  const currentUserRole = localStorage.getItem("role") || "";

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (currentUserRole === "ADMIN") {
      API.get("/users")
        .then((res) => setWorkers((res.data || []).filter((u: { role: string }) => u.role === "WORKER")))
        .catch(() => {});
    }
  }, [currentUserRole]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/tasks/${id}`);
      setTask(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching task:", err);
      setError("Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await API.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTask();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  const updateWorkers = async (workerIds: number[]) => {
    try {
      setSavingWorkers(true);
      await API.put(`/tasks/${id}`, { workerIds });
      fetchTask();
    } catch (err) {
      console.error("Error updating workers:", err);
      alert("Failed to update assignment");
    } finally {
      setSavingWorkers(false);
    }
  };

  const requestCompletion = async () => {
    if (!confirm("Request admin approval to mark this task as completed?")) {
      return;
    }
    
    try {
      await API.patch(`/tasks/${id}/status`, { status: "PENDING_APPROVAL" });
      
      await API.post(`/tasks/${id}/comments`, {
        userId: currentUserId,
        content: "🔔 Worker has requested completion approval for this task.",
      });
      
      fetchTask();
      alert("Completion request submitted! Waiting for admin approval.");
    } catch (err) {
      console.error("Error requesting completion:", err);
      alert("Failed to request completion");
    }
  };

  const approveCompletion = async () => {
    if (!confirm("Approve this task as completed?")) {
      return;
    }
    
    try {
      await API.patch(`/tasks/${id}/status`, { status: "COMPLETED" });
      await API.post(`/tasks/${id}/comments`, {
        userId: currentUserId,
        content: "✅ Admin has approved the task completion.",
      });
      fetchTask();
    } catch (err) {
      console.error("Error approving completion:", err);
      alert("Failed to approve completion");
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      setAddingComment(true);
      await API.post(`/tasks/${id}/comments`, {
        userId: currentUserId,
        content: newComment,
      });
      setNewComment("");
      fetchTask();
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  const addFileComment = async (fileId: number) => {
    const comment = fileComments[fileId]?.trim();
    if (!comment) return;

    try {
      setAddingFileComment({ ...addingFileComment, [fileId]: true });
      await API.post(`/tasks/${id}/files/${fileId}/comments`, {
        userId: currentUserId,
        content: comment,
      });
      setFileComments({ ...fileComments, [fileId]: "" });
      fetchTask();
    } catch (err) {
      console.error("Error adding file comment:", err);
      alert("Failed to add comment");
    } finally {
      setAddingFileComment({ ...addingFileComment, [fileId]: false });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("section", fileSection);
      formData.append("caption", fileCaption);
      formData.append("fileType", fileType);
      formData.append("uploadedBy", currentUserId.toString());

      await API.post(`/tasks/${id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSelectedFile(null);
      setFileSection("");
      setFileCaption("");
      setFileType("screenshot");
      fetchTask();
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--color-text-muted)]"></div>
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--color-text-muted)] opacity-80" style={{ animationDelay: "0.1s" }}></div>
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--color-text-muted)] opacity-60" style={{ animationDelay: "0.2s" }}></div>
          </div>
          <span className="text-lg font-medium text-[var(--color-text-muted)]">Loading task...</span>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6">
          <p className="mb-2 text-lg font-semibold text-red-800">Error:</p>
          <p className="text-red-600">{error || "Task not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary mt-4 px-4 py-2 text-sm font-semibold rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "IN_PROGRESS":
      case "PENDING_APPROVAL":
      case "PENDING":
      default:
        return "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border-hover)]";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return "Pending Approval";
      case "IN_PROGRESS":
        return "In Progress";
      default:
        return status;
    }
  };

  const filesBySection: { [key: string]: TaskFile[] } = {};
  task.files.forEach((file) => {
    const section = file.section || "Uncategorized";
    if (!filesBySection[section]) {
      filesBySection[section] = [];
    }
    filesBySection[section].push(file);
  });

  return (
    <div className="min-h-screen bg-app py-24">
      <div className="mx-auto max-w-7xl px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 shadow-lg shadow-[var(--color-card-shadow)] backdrop-blur-md">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">{task.title}</h1>
              <p className="text-[var(--color-text-secondary)]">{task.description || "No description provided"}</p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${getStatusColor(task.status)}`}>
              {getStatusDisplay(task.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">Client</p>
              <p className="text-[var(--color-text-primary)]">{task.client.name}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{task.client.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">Assigned Workers</p>
              {currentUserRole === "ADMIN" ? (
                <div className="mt-1">
                  <WorkerMultiSelect
                    workers={workers}
                    value={task.workers?.map((tw) => tw.user.id) ?? []}
                    onChange={(ids) => updateWorkers(ids)}
                    placeholder="Select workers..."
                    autoApply={false}
                  />
                  {savingWorkers && (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Saving...</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-[var(--color-text-primary)]">
                    {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"}
                  </p>
                  {task.workers?.length ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {task.workers.map((tw) => tw.user.email).join(", ")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">Due Date</p>
              <p className="text-[var(--color-text-primary)]">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
              </p>
            </div>
          </div>

          {/* Role-based Status Controls */}
          {currentUserRole === "ADMIN" && (
            <AdminStatusControls
              currentStatus={task.status}
              onStatusChange={updateStatus}
              onApproveCompletion={approveCompletion}
            />
          )}
          {currentUserRole === "WORKER" && (
            <WorkerStatusControls
              currentStatus={task.status}
              onRequestCompletion={requestCompletion}
            />
          )}
          {currentUserRole === "CLIENT" && <ClientStatusView currentStatus={task.status} />}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Files Section */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 shadow-lg shadow-[var(--color-card-shadow)] backdrop-blur-md">
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">Files & Screenshots</h2>

            {/* Upload Form */}
            <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">Upload File</h3>
              <div className="space-y-3">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                >
                  <option value="screenshot">Screenshot</option>
                  <option value="document">Document</option>
                  <option value="design">Design File</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Section (e.g., Homepage, Admin Panel)"
                  value={fileSection}
                  onChange={(e) => setFileSection(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <input
                  type="text"
                  placeholder="Caption/Description (optional)"
                  value={fileCaption}
                  onChange={(e) => setFileCaption(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
                <button
                  onClick={uploadFile}
                  disabled={uploadingFile || !selectedFile}
                  className="btn-primary w-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingFile ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </div>

            {/* Files List with Individual Comments */}
            {Object.keys(filesBySection).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(filesBySection).map(([section, files]) => (
                  <div key={section} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                    <h4 className="mb-3 text-sm font-bold text-[var(--color-text-muted)]">{section}</h4>
                    <div className="space-y-4">
                      {files.map((file) => (
                        <div key={file.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                          {/* File Header */}
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-[var(--color-text-primary)]">{file.fileName}</p>
                              {file.caption && (
                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{file.caption}</p>
                              )}
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {file.fileType} • v{file.version} • {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <a
                                onClick={() => {
                                setViewerFile(file);
                                setViewerOpen(true);
                              }}
                              href={`http://localhost:4001${file.fileUrl}`}
                              className="btn-primary px-3 py-1 text-xs font-semibold"
                            >
                              View
                            </a>
                          </div>

                          {/* File Comments Section */}
                          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                            <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">Comments on this file:</p>

                            {/* Existing Comments */}
                            {file.comments && file.comments.length > 0 ? (
                              <div className="mb-3 space-y-2">
                                {file.comments.map((comment) => (
                                  <div key={comment.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
                                    <div className="mb-1 flex items-start justify-between">
                                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                                        {comment.user?.name || `User #${comment.userId}`}
                                      </p>
                                      <p className="text-xs text-[var(--color-text-muted)]">
                                        {new Date(comment.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)]">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mb-3 text-xs text-[var(--color-text-muted)]">No comments yet</p>
                            )}

                            {/* Add Comment */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={fileComments[file.id] || ""}
                                onChange={(e) => setFileComments({ ...fileComments, [file.id]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    addFileComment(file.id);
                                  }
                                }}
                                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                              />
                              <button
                                onClick={() => addFileComment(file.id)}
                                disabled={addingFileComment[file.id] || !fileComments[file.id]?.trim()}
                                className="btn-primary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {addingFileComment[file.id] ? "..." : "Add"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[var(--color-text-muted)]">No files uploaded yet</p>
            )}
          </div>

          {/* General Comments Section */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 shadow-lg shadow-[var(--color-card-shadow)] backdrop-blur-md">
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">General Comments & Notes</h2>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                placeholder="Add a general comment or note about the task..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="mb-2 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
              <button
                onClick={addComment}
                disabled={addingComment || !newComment.trim()}
                className="btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingComment ? "Adding..." : "Add Comment"}
              </button>
            </div>

            {/* Comments List */}
            {task.comments.length > 0 ? (
              <div className="space-y-3">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {comment.user?.name || `User #${comment.userId}`}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[var(--color-text-muted)]">No general comments yet</p>
            )}
          </div>
        </div>
      </div>
      <FileViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        file={viewerFile}
      />
    </div>
  );
};

export default TaskDetailPage;