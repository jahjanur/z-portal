import React, { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import API, { getFileUrl } from "../api";
import AdminStatusControls from "../components/taskdetail/AdminStatusControls";
import WorkerStatusControls from "../components/taskdetail/WorkerStatusControls";
import ClientStatusView from "../components/taskdetail/ClientStatusView";
import FileViewer from "../components/FileViewer";
import WorkerMultiSelect from "../components/ui/WorkerMultiSelect";
import Button from "../components/ui/Button";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonDashboard } from "../components/ui/Skeleton";

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
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
  uploader?: { id: number; name: string; role: string } | null;
  reviewStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION" | "REJECTED";
  reviewComment: string | null;
  visibleToClient?: boolean;
  comments?: FileComment[];
}

interface TaskComment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  visibleToClient?: boolean;
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

const roleTone = (role?: string): "info" | "neutral" | "success" =>
  role === "ADMIN" || role === "ERASPHERE" ? "info" : role === "WORKER" ? "neutral" : "success";

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightDoneRef = useRef(false);

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
  const [refreshing, setRefreshing] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"worker" | "client">("worker");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<TaskFile | null>(null);
  const [workers, setWorkers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [savingWorkers, setSavingWorkers] = useState(false);
  const [unreadByTaskThread, setUnreadByTaskThread] = useState({ internal: 0, client: 0 });
  const [reviewState, setReviewState] = useState<{
    [fileId: number]: {
      pending: "NEEDS_REVISION" | "REJECTED" | null; // which button opened the comment box
      comment: string;
      saving: boolean;
    };
  }>({});

  const currentUserId = parseInt(localStorage.getItem("userId") || "0");
  const currentUserRole = localStorage.getItem("role") || "";
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "ERASPHERE";

  // localStorage-based last-seen timestamps for channel dot indicators (admin only)
  const [lastSeenTs, setLastSeenTs] = useState<{ worker: number; client: number }>(() => ({
    worker: parseInt(localStorage.getItem(`z_lastSeen_${id ?? ""}_worker`) || "0"),
    client: parseInt(localStorage.getItem(`z_lastSeen_${id ?? ""}_client`) || "0"),
  }));

  const touchSeen = useCallback((channel: "worker" | "client") => {
    const now = Date.now();
    localStorage.setItem(`z_lastSeen_${id}_${channel}`, String(now));
    setLastSeenTs((prev) => ({ ...prev, [channel]: now }));
  }, [id]);

  useEffect(() => {
    fetchTask();
    highlightDoneRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Scroll to and highlight comment when opened from notification (e.g. ?highlightComment=123 or ?highlightFileComment=456)
  useEffect(() => {
    if (!task || highlightDoneRef.current) return;
    const highlightCommentId = searchParams.get("highlightComment");
    const highlightFileCommentId = searchParams.get("highlightFileComment");
    const commentId = highlightCommentId ?? highlightFileCommentId;
    if (!commentId) return;

    const timeoutId = setTimeout(() => {
      const el = document.getElementById(`task-comment-${commentId}`) ?? document.getElementById(`file-comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("comment-highlight-glow");
        highlightDoneRef.current = true;
        setTimeout(() => {
          el.classList.remove("comment-highlight-glow");
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("highlightComment");
            next.delete("highlightFileComment");
            return next.toString() ? next : new URLSearchParams();
          }, { replace: true });
        }, 3000);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [task, searchParams, setSearchParams]);

  useEffect(() => {
    if (currentUserRole === "ADMIN") {
      API.get("/users")
        .then((res) => setWorkers((res.data || []).filter((u: { role: string }) => u.role === "WORKER")))
        .catch(() => {});
    }
  }, [currentUserRole]);

  const fetchTask = async () => {
    try {
      if (!task) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await API.get(`/tasks/${id}`);
      setTask(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching task:", err);
      if (!task) setError("Failed to load task");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadByTask = useCallback(async () => {
    if (!id || !isAdmin) return;
    try {
      const { data } = await API.get<{ internal: number; client: number }>("/notifications/unread-by-task", {
        params: { taskId: id },
      });
      setUnreadByTaskThread({ internal: data?.internal ?? 0, client: data?.client ?? 0 });
    } catch {
      // ignore
    }
  }, [id, isAdmin]);

  // Fetch unread counts for task tabs when task is loaded (admin only)
  useEffect(() => {
    if (task?.id && isAdmin) fetchUnreadByTask();
  }, [task?.id, isAdmin, fetchUnreadByTask]);

  // Mark the initially active channel as seen when task first loads (admin only)
  useEffect(() => {
    if (isAdmin && task?.id) touchSeen(activeChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, task?.id]);

  // When admin views a tab, mark that thread as read so badge clears
  useEffect(() => {
    if (!id || !isAdmin || !task?.id) return;
    const taskIdNum = parseInt(id, 10);
    if (isNaN(taskIdNum)) return;
    const threadType = activeChannel === "client" ? "client" : "internal";
    API.patch("/notifications/mark-read-for-task", { taskId: taskIdNum, threadType })
      .then(() => fetchUnreadByTask())
      .catch(() => {});
  }, [activeChannel, id, isAdmin, task?.id]);

  const updateStatus = async (newStatus: string) => {
    try {
      await API.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTask();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  const updateWorkers = async (workerIds: number[]) => {
    try {
      setSavingWorkers(true);
      await API.put(`/tasks/${id}`, { workerIds });
      toast.success("Workers assigned successfully");
      fetchTask();
    } catch (err) {
      console.error("Error updating workers:", err);
      toast.error("Failed to update assignment");
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
        visibleToClient: false,
      });

      fetchTask();
      toast.success("Completion request submitted! Waiting for admin approval.");
    } catch (err) {
      console.error("Error requesting completion:", err);
      toast.error("Failed to request completion");
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
        visibleToClient: false,
      });
      fetchTask();
    } catch (err) {
      console.error("Error approving completion:", err);
      toast.error("Failed to approve completion");
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const visibleToClient = isAdmin
      ? activeChannel === "client"
      : currentUserRole === "CLIENT";
    try {
      setAddingComment(true);
      await API.post(`/tasks/${id}/comments`, {
        userId: currentUserId,
        content: newComment,
        visibleToClient,
      });
      setNewComment("");
      fetchTask();
      if (isAdmin) fetchUnreadByTask();
    } catch (err: any) {
      console.error("Error adding comment:", err);
      const msg = err?.response?.data?.details ?? err?.response?.data?.error ?? "Failed to add comment";
      toast.error(msg);
    } finally {
      setAddingComment(false);
    }
  };

  const submitReview = async (
    fileId: number,
    status: "APPROVED" | "NEEDS_REVISION" | "REJECTED",
    comment?: string
  ) => {
    setReviewState((prev) => ({
      ...prev,
      [fileId]: { ...prev[fileId], saving: true },
    }));
    try {
      const updated = await API.patch(`/tasks/${id}/files/${fileId}/review`, { status, comment });
      // Optimistically update the file in task state
      setTask((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.map((f) =>
                f.id === fileId
                  ? { ...f, reviewStatus: updated.data.reviewStatus, reviewComment: updated.data.reviewComment }
                  : f
              ),
            }
          : prev
      );
      setReviewState((prev) => ({
        ...prev,
        [fileId]: { pending: null, comment: "", saving: false },
      }));
      toast.success(
        status === "APPROVED"
          ? "File approved"
          : status === "NEEDS_REVISION"
          ? "Revision requested"
          : "File rejected"
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to submit review";
      toast.error(msg);
      setReviewState((prev) => ({
        ...prev,
        [fileId]: { ...prev[fileId], saving: false },
      }));
    }
  };

  const addFileComment = async (fileId: number) => {
    const comment = fileComments[fileId]?.trim();
    if (!comment) return;

    try {
      setAddingFileComment({ ...addingFileComment, [fileId]: true });
      const visibleToClient = isAdmin ? activeChannel === "client" : currentUserRole === "CLIENT";
      await API.post(`/tasks/${id}/files/${fileId}/comments`, {
        userId: currentUserId,
        content: comment,
        visibleToClient,
      });
      setFileComments({ ...fileComments, [fileId]: "" });
      fetchTask();
    } catch (err) {
      console.error("Error adding file comment:", err);
      toast.error("Failed to add comment");
    } finally {
      setAddingFileComment({ ...addingFileComment, [fileId]: false });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
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
      if (isAdmin) {
        formData.append("visibleToClient", activeChannel === "client" ? "true" : "false");
      }

      await API.post(`/tasks/${id}/files`, formData, {
        headers: { "Content-Type": undefined },
      });

      setSelectedFile(null);
      setFileSection("");
      setFileCaption("");
      setFileType("screenshot");
      fetchTask();
      toast.success("File uploaded successfully!");
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-app py-24">
        <div className="mx-auto max-w-7xl min-w-0 px-4">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-6 shadow-elev-sm">
          <p className="mb-1 text-lg font-semibold text-[var(--color-destructive-text)]">Something went wrong</p>
          <p className="text-sm text-[var(--color-destructive-text)] opacity-90">{error || "Task not found"}</p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={() => navigate("/dashboard")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const visibleFiles = task.files.filter((f) => {
    if (!isAdmin) return true; // worker/client: backend already filtered to their channel
    // Admin: filter by active channel tab
    return activeChannel === "worker"
      ? f.visibleToClient === false
      : f.visibleToClient !== false; // true or undefined (legacy records)
  });

  const filesBySection: { [key: string]: TaskFile[] } = {};
  visibleFiles.forEach((file) => {
    const section = file.section || "Uncategorized";
    if (!filesBySection[section]) {
      filesBySection[section] = [];
    }
    filesBySection[section].push(file);
  });

  // Dot indicators: unseen activity from non-admin users since admin last viewed each channel
  const hasUnseen = isAdmin
    ? {
        worker:
          task.files
            .filter((f) => f.visibleToClient === false && f.uploadedBy !== currentUserId)
            .some((f) => new Date(f.uploadedAt).getTime() > lastSeenTs.worker) ||
          task.comments
            .filter((c) => !c.visibleToClient && c.userId !== currentUserId)
            .some((c) => new Date(c.createdAt).getTime() > lastSeenTs.worker),
        client:
          task.files
            .filter((f) => f.visibleToClient !== false && f.uploadedBy !== currentUserId)
            .some((f) => new Date(f.uploadedAt).getTime() > lastSeenTs.client) ||
          task.comments
            .filter((c) => !!c.visibleToClient && c.userId !== currentUserId)
            .some((c) => new Date(c.createdAt).getTime() > lastSeenTs.client),
      }
    : { worker: false, client: false };

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-app py-24">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6 px-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="card-panel animate-fade-up p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="page-title mb-2">{task.title}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {task.description || "No description provided"}
              </p>
            </div>
            <StatusBadge status={task.status} className="shrink-0 self-start" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Client</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                {task.client?.name ?? "Client removed"}
              </p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{task.client?.email ?? ""}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Assigned Workers</p>
              {currentUserRole === "ADMIN" ? (
                <div className="mt-1">
                  <WorkerMultiSelect
                    workers={workers}
                    value={task.workers?.map((tw) => tw.user.id) ?? []}
                    onChange={(ids) => updateWorkers(ids)}
                    placeholder="Select workers..."
                    autoApply={false}
                    usePortal
                  />
                  {savingWorkers && (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Saving...</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                    {task.workers?.length ? task.workers.map((tw) => tw.user.name).join(", ") : "Unassigned"}
                  </p>
                  {task.workers?.length ? (
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {task.workers.map((tw) => tw.user.email).join(", ")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Due Date</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
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
          <div className="card-panel min-w-0 p-5 sm:p-6">
            {/* Header row */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-title">
                Files & Screenshots
                {refreshing && (
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">Refreshing...</span>
                )}
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchTask} disabled={refreshing}>
                ↻ Refresh
              </Button>
            </div>

            {/* Channel tabs — admin only; worker/client see their channel directly */}
            {isAdmin && (
              <div className="mb-4 flex flex-wrap gap-2">
                {([
                  { key: "worker" as const, label: "Worker Channel", count: unreadByTaskThread.internal },
                  { key: "client" as const, label: "Client Channel", count: unreadByTaskThread.client },
                ] as const).map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setActiveChannel(key); touchSeen(key); }}
                    className={`relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      activeChannel === key
                        ? "bg-[var(--color-tab-active-bg)] text-[var(--color-tab-active-text)] border-[var(--color-tab-active-border)]"
                        : "border-[var(--color-tab-inactive-border)] bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-[var(--color-tab-inactive-hover-bg)]"
                    }`}
                  >
                    {/* Dot: unseen activity from client/worker */}
                    {hasUnseen[key] && activeChannel !== key && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--color-panel-solid)] bg-[var(--color-destructive-text)]" />
                    )}
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-destructive-bg)] px-1.5 text-xs font-bold text-[var(--color-destructive-text)]">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Upload Form */}
            <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">Upload File</h3>
                {isAdmin && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Posting to {activeChannel === "client" ? "Client" : "Worker"}
                  </span>
                )}
              </div>
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
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={uploadFile}
                  loading={uploadingFile}
                  disabled={uploadingFile || !selectedFile}
                >
                  {uploadingFile ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>

            {/* Files List with Individual Comments */}
            {Object.keys(filesBySection).length > 0 ? (
              <div className="space-y-4 stagger-children">
                {Object.entries(filesBySection).map(([section, files]) => (
                  <div key={section} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{section}</h4>
                    <div className="space-y-4">
                      {files.map((file) => {
                        const rs = file.reviewStatus ?? "PENDING";
                        const rc = file.reviewComment;
                        const isWorkerUpload = file.uploader?.role === "WORKER";
                        const reviewEntry = reviewState[file.id] ?? { pending: null, comment: "", saving: false };
                        const needsAction = rs === "NEEDS_REVISION" || rs === "REJECTED";

                        // Card border highlight for worker when action needed
                        const cardBorder =
                          currentUserRole === "WORKER" && needsAction
                            ? rs === "NEEDS_REVISION"
                              ? "border-[var(--color-warning-border)]"
                              : "border-[var(--color-destructive-border)]"
                            : "border-[var(--color-border)]";

                        return (
                        <div key={file.id} className={`rounded-xl border bg-[var(--color-surface-1)] p-4 ${cardBorder}`}>
                          {/* File Header */}
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-medium text-[var(--color-text-primary)]">{file.fileName}</p>
                              {file.caption && (
                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{file.caption}</p>
                              )}
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {file.fileType} • v{file.version} • {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                              {file.uploader && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <StatusBadge
                                    dot={false}
                                    tone={roleTone(file.uploader.role)}
                                    className="uppercase tracking-wide"
                                  >
                                    {file.uploader.role === "ERASPHERE" ? "Admin" : file.uploader.role}
                                  </StatusBadge>
                                  <span className="text-xs text-[var(--color-text-muted)]">{file.uploader.name}</span>
                                </div>
                              )}

                              {/* Review status badge — only relevant for worker-uploaded files */}
                              {isWorkerUpload && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {rs === "PENDING" && <StatusBadge tone="neutral">Awaiting Review</StatusBadge>}
                                  {rs === "APPROVED" && <StatusBadge status="APPROVED" />}
                                  {rs === "NEEDS_REVISION" && <StatusBadge tone="warning">Needs Revision</StatusBadge>}
                                  {rs === "REJECTED" && <StatusBadge status="REJECTED" />}
                                </div>
                              )}

                              {/* Review comment (visible to all) */}
                              {isWorkerUpload && rc && (
                                <p className={`mt-1.5 rounded-lg border px-3 py-2 text-xs italic ${
                                  rs === "NEEDS_REVISION"
                                    ? "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                                    : "border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)]"
                                }`}>
                                  "{rc}"
                                </p>
                              )}

                              {/* Worker prompt when action needed */}
                              {currentUserRole === "WORKER" && needsAction && (
                                <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                                  {rs === "NEEDS_REVISION"
                                    ? "↑ Please upload a revised version of this file."
                                    : "↑ This file has been rejected. You may upload a replacement."}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => { setViewerFile(file); setViewerOpen(true); }}
                              >
                                View
                              </Button>
                              <a
                                href={getFileUrl(file.fileUrl)}
                                download={file.fileName}
                                className="btn-secondary h-9 px-3 text-xs"
                              >
                                Download
                              </a>
                            </div>
                          </div>

                          {/* Admin review actions — only for worker-uploaded files, locked once APPROVED */}
                          {currentUserRole === "ADMIN" && activeChannel === "worker" && isWorkerUpload && rs !== "APPROVED" && (
                            <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                                Review Decision
                              </p>

                              {/* Action buttons — visible for PENDING, NEEDS_REVISION, REJECTED */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={reviewEntry.saving}
                                  onClick={() => submitReview(file.id, "APPROVED")}
                                  className="!border-[var(--color-success-border)] !bg-[var(--color-success-bg)] !text-[var(--color-success-text)]"
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={reviewEntry.saving}
                                  onClick={() =>
                                    setReviewState((prev) => ({
                                      ...prev,
                                      [file.id]: {
                                        ...prev[file.id],
                                        pending: reviewEntry.pending === "NEEDS_REVISION" ? null : "NEEDS_REVISION",
                                        comment: prev[file.id]?.comment ?? "",
                                        saving: false,
                                      },
                                    }))
                                  }
                                  className={`!border-[var(--color-warning-border)] !bg-[var(--color-warning-bg)] !text-[var(--color-warning-text)] ${
                                    rs === "NEEDS_REVISION" ? "ring-2 ring-[var(--color-warning-border)]" : ""
                                  }`}
                                >
                                  ✎ Needs Revision
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={reviewEntry.saving}
                                  onClick={() =>
                                    setReviewState((prev) => ({
                                      ...prev,
                                      [file.id]: {
                                        ...prev[file.id],
                                        pending: reviewEntry.pending === "REJECTED" ? null : "REJECTED",
                                        comment: prev[file.id]?.comment ?? "",
                                        saving: false,
                                      },
                                    }))
                                  }
                                  className={`!border-[var(--color-destructive-border)] !bg-[var(--color-destructive-bg)] !text-[var(--color-destructive-text)] ${
                                    rs === "REJECTED" ? "ring-2 ring-[var(--color-destructive-border)]" : ""
                                  }`}
                                >
                                  ✗ Reject
                                </Button>
                              </div>

                              {/* Inline comment box for Needs Revision / Reject */}
                              {reviewEntry.pending && (
                                <div className="mt-3 space-y-2">
                                  <textarea
                                    rows={2}
                                    placeholder={
                                      reviewEntry.pending === "NEEDS_REVISION"
                                        ? "Describe what needs to be changed…"
                                        : "Reason for rejection…"
                                    }
                                    value={reviewEntry.comment}
                                    onChange={(e) =>
                                      setReviewState((prev) => ({
                                        ...prev,
                                        [file.id]: { ...prev[file.id], comment: e.target.value },
                                      }))
                                    }
                                    className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      disabled={reviewEntry.saving || !reviewEntry.comment.trim()}
                                      onClick={() => submitReview(file.id, reviewEntry.pending!, reviewEntry.comment)}
                                    >
                                      {reviewEntry.saving ? "Submitting…" : "Submit"}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        setReviewState((prev) => ({
                                          ...prev,
                                          [file.id]: { ...prev[file.id], pending: null },
                                        }))
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* File Comments Section */}
                          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                            <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">Comments on this file:</p>

                            {file.comments && file.comments.length > 0 ? (
                              <div className="mb-3 space-y-2">
                                {file.comments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    id={`file-comment-${comment.id}`}
                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 scroll-mt-4"
                                  >
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                                        {comment.user?.name || `User #${comment.userId}`}
                                      </p>
                                      <p className="shrink-0 text-xs text-[var(--color-text-muted)]">
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

                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={fileComments[file.id] || ""}
                                onChange={(e) => setFileComments({ ...fileComments, [file.id]: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") addFileComment(file.id);
                                }}
                                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                              />
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => addFileComment(file.id)}
                                disabled={addingFileComment[file.id] || !fileComments[file.id]?.trim()}
                              >
                                {addingFileComment[file.id] ? "..." : "Add"}
                              </Button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title="No files yet"
                description="No files uploaded yet. Files and screenshots shared on this task will appear here."
              />
            )}
          </div>

          {/* General Comments Section */}
          <div className="card-panel min-w-0 p-5 sm:p-6">
            <h2 className="section-title mb-4">General Comments & Notes</h2>

            {/* Add Comment */}
            <div className="mb-6">
              {isAdmin && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Posting to {activeChannel === "client" ? "Client" : "Worker"}
                  </span>
                </div>
              )}
              <textarea
                placeholder={
                  isAdmin
                    ? activeChannel === "client"
                      ? "Add a comment visible to the client..."
                      : "Add an internal note for admin & workers..."
                    : "Add a comment or note about the task..."
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="mb-3 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={addComment}
                  loading={addingComment}
                  disabled={addingComment || !newComment.trim()}
                >
                  {addingComment ? "Adding..." : "Add Comment"}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {(() => {
              const commentsToShow = isAdmin
                ? activeChannel === "worker"
                  ? task.comments.filter((c) => !c.visibleToClient)
                  : task.comments.filter((c) => c.visibleToClient)
                : task.comments;
              return commentsToShow.length > 0 ? (
                <div className="space-y-3 stagger-children">
                  {commentsToShow.map((comment) => (
                    <div
                      key={comment.id}
                      id={`task-comment-${comment.id}`}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 scroll-mt-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {comment.user?.role && (
                            <StatusBadge
                              dot={false}
                              tone={roleTone(comment.user.role)}
                              className="uppercase tracking-wide"
                            >
                              {comment.user.role === "ERASPHERE" ? "Admin" : comment.user.role}
                            </StatusBadge>
                          )}
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {comment.user?.name || `User #${comment.userId}`}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-[var(--color-text-muted)]">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  title="No comments yet"
                  description={
                    isAdmin
                      ? activeChannel === "worker"
                        ? "No worker channel comments yet."
                        : "No client channel comments yet."
                      : "Comments and notes about this task will appear here."
                  }
                />
              );
            })()}
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
