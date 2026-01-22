import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import AdminStatusControls from "../components/taskdetail/AdminStatusControls";
import WorkerStatusControls from "../components/taskdetail/WorkerStatusControls";
import ClientStatusView from "../components/taskdetail/ClientStatusView";
import FileViewer from "../components/FileViewer";

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
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
  worker: User | null;
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


  const currentUserId = parseInt(localStorage.getItem("userId") || "0");
  const currentUserRole = localStorage.getItem("role") || "";

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: "0.1s" }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: "0.2s" }}></div>
          </div>
          <span className="text-lg font-medium text-gray-700">Loading task...</span>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <p className="mb-2 text-lg font-semibold text-red-800">Error:</p>
          <p className="text-red-600">{error || "Task not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 mt-4 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: colors.primary }}
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
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING_APPROVAL":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
    <div className="min-h-screen py-24 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-6 text-gray-600 transition-colors hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-gray-600">{task.description || "No description provided"}</p>
            </div>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(task.status)}`}>
              {getStatusDisplay(task.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Client</p>
              <p className="text-gray-900">{task.client.name}</p>
              <p className="text-sm text-gray-500">{task.client.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Assigned Worker</p>
              <p className="text-gray-900">{task.worker?.name || "Unassigned"}</p>
              {task.worker && <p className="text-sm text-gray-500">{task.worker.email}</p>}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Due Date</p>
              <p className="text-gray-900">
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
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Files & Screenshots</h2>

            {/* Upload Form */}
            <div className="p-4 mb-6 border border-gray-200 bg-gray-50 rounded-xl">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Upload File</h3>
              <div className="space-y-3">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
                />
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Caption/Description (optional)"
                  value={fileCaption}
                  onChange={(e) => setFileCaption(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
                />
                <button
                  onClick={uploadFile}
                  disabled={uploadingFile || !selectedFile}
                  className="w-full px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: colors.primary }}
                >
                  {uploadingFile ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </div>

            {/* Files List with Individual Comments */}
            {Object.keys(filesBySection).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(filesBySection).map(([section, files]) => (
                  <div key={section} className="p-4 border border-gray-200 rounded-xl">
                    <h4 className="mb-3 text-sm font-bold text-gray-700">{section}</h4>
                    <div className="space-y-4">
                      {files.map((file) => (
                        <div key={file.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          {/* File Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{file.fileName}</p>
                              {file.caption && (
                                <p className="mt-1 text-sm text-gray-600">{file.caption}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                {file.fileType} • v{file.version} • {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <a
                                onClick={() => {
                                setViewerFile(file);
                                setViewerOpen(true);
                              }}
                              href={`http://localhost:4001${file.fileUrl}`}
                              className="px-3 py-1 text-xs font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
                              style={{ backgroundColor: colors.primary }}
                            >
                              View
                            </a>
                          </div>

                          {/* File Comments Section */}
                          <div className="pt-3 mt-3 border-t border-gray-200">
                            <p className="mb-2 text-xs font-semibold text-gray-600">Comments on this file:</p>
                            
                            {/* Existing Comments */}
                            {file.comments && file.comments.length > 0 ? (
                              <div className="mb-3 space-y-2">
                                {file.comments.map((comment) => (
                                  <div key={comment.id} className="p-2 bg-white border border-gray-200 rounded-lg">
                                    <div className="flex items-start justify-between mb-1">
                                      <p className="text-xs font-semibold text-gray-900">
                                        {comment.user?.name || `User #${comment.userId}`}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-700">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mb-3 text-xs text-gray-400">No comments yet</p>
                            )}

                            {/* Add Comment */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={fileComments[file.id] || ""}
                                onChange={(e) => setFileComments({ ...fileComments, [file.id]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addFileComment(file.id);
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                              />
                              <button
                                onClick={() => addFileComment(file.id)}
                                disabled={addingFileComment[file.id] || !fileComments[file.id]?.trim()}
                                className="px-3 py-2 text-xs font-semibold text-white transition-opacity rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                                style={{ backgroundColor: colors.primary }}
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
              <p className="py-8 text-center text-gray-500">No files uploaded yet</p>
            )}
          </div>

          {/* General Comments Section */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">General Comments & Notes</h2>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                placeholder="Add a general comment or note about the task..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 mb-2 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              />
              <button
                onClick={addComment}
                disabled={addingComment || !newComment.trim()}
                className="px-4 py-2 text-sm font-semibold text-white transition-opacity rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                {addingComment ? "Adding..." : "Add Comment"}
              </button>
            </div>

            {/* Comments List */}
            {task.comments.length > 0 ? (
              <div className="space-y-3">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {comment.user?.name || `User #${comment.userId}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-gray-500">No general comments yet</p>
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