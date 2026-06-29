import React, { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import API, { getFileUrl } from "../api";
import FileViewer from "../components/FileViewer";
import Button from "../components/ui/Button";
import { SkeletonDashboard } from "../components/ui/Skeleton";
import TaskConversation from "../components/taskdetail/TaskConversation";

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
  projectId?: number | null;
  project?: { id: number; name: string; description?: string | null } | null;
}

interface SiblingTask {
  id: number;
  title: string;
  status: string;
  projectId?: number | null;
  project?: { id: number } | null;
}

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Sibling tasks in the same project (for the project switcher)
  const [siblingTasks, setSiblingTasks] = useState<SiblingTask[]>([]);
  useEffect(() => {
    const pid = task?.project?.id;
    if (!pid) { setSiblingTasks([]); return; }
    API.get("/tasks")
      .then((res) => setSiblingTasks((res.data || []).filter((t: SiblingTask) => (t.projectId ?? t.project?.id) === pid)))
      .catch(() => {});
  }, [task?.project?.id]);

  const fetchTask = async (opts?: { silent?: boolean }) => {
    try {
      if (!task) {
        setLoading(true);
      } else if (!opts?.silent) {
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

  // Live auto-refresh: poll while the tab is visible and refetch immediately when
  // the window regains focus, so new files/comments from others appear without a
  // manual reload. Silent = no visible refreshing indicator on these background pulls.
  const fetchTaskRef = useRef(fetchTask);
  fetchTaskRef.current = fetchTask;
  useEffect(() => {
    if (!id) return;
    const refresh = () => { if (!document.hidden && localStorage.getItem("token")) fetchTaskRef.current({ silent: true }); };
    const interval = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id]);

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

  const deleteComment = async (commentId: number) => {
    try {
      await API.delete(`/tasks/${id}/comments/${commentId}`);
      fetchTask({ silent: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't delete message");
    }
  };

  /** Admin: re-post a message into the other channel (e.g. a client note → the
   *  worker/team channel) so it doesn't have to be copy-pasted by hand. */
  const forwardComment = async (content: string, toClient: boolean) => {
    if (!content.trim()) return;
    try {
      await API.post(`/tasks/${id}/comments`, {
        userId: currentUserId,
        content,
        visibleToClient: toClient,
      });
      setActiveChannel(toClient ? "client" : "worker");
      toast.success(`Forwarded to ${toClient ? "client" : "worker"} channel`);
      fetchTask();
      if (isAdmin) fetchUnreadByTask();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't forward message");
    }
  };

  /** Admin: clone a deliverable into the other channel (same file, new channel). */
  const forwardFile = async (fileId: number, toClient: boolean) => {
    try {
      await API.post(`/tasks/${id}/files/${fileId}/forward`, { toClient });
      setActiveChannel(toClient ? "client" : "worker");
      toast.success(`Deliverable forwarded to ${toClient ? "client" : "worker"} channel`);
      fetchTask();
      if (isAdmin) fetchUnreadByTask();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't forward deliverable");
    }
  };

  const deleteFile = async (fileId: number) => {
    try {
      await API.delete(`/tasks/${id}/files/${fileId}`);
      fetchTask({ silent: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't delete file");
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

  const guessFileType = (name: string): string => {
    if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name)) return "screenshot";
    if (/\.(pdf|docx?|txt|md|csv|xlsx?|pptx?)$/i.test(name)) return "document";
    if (/\.(fig|sketch|psd|ai|xd)$/i.test(name)) return "design";
    return "other";
  };

  // Upload every selected file (one request each, sequential). The optional note
  // is attached to the first file only so it isn't duplicated on every upload.
  const uploadFiles = async (opts?: { caption?: string }) => {
    if (!selectedFiles.length) {
      toast.error("Please select a file");
      return;
    }

    setUploadingFile(true);
    let ok = 0;
    const failed: string[] = [];
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("section", "");
          formData.append("caption", i === 0 ? (opts?.caption ?? "") : "");
          formData.append("fileType", guessFileType(file.name));
          formData.append("uploadedBy", currentUserId.toString());
          if (isAdmin) {
            formData.append("visibleToClient", activeChannel === "client" ? "true" : "false");
          }
          await API.post(`/tasks/${id}/files`, formData, {
            headers: { "Content-Type": undefined },
          });
          ok++;
        } catch {
          failed.push(file.name);
        }
      }

      setSelectedFiles([]);
      fetchTask();
      if (failed.length === 0) {
        toast.success(ok > 1 ? `${ok} files uploaded` : "File uploaded successfully!");
      } else if (ok > 0) {
        toast.error(`Uploaded ${ok}, but ${failed.length} failed`);
      } else {
        toast.error("Failed to upload files");
      }
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
    <>
      <TaskConversation
        task={task}
        project={task.project}
        siblingTasks={siblingTasks}
        isAdmin={isAdmin}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        navigate={navigate}
        workers={workers}
        savingWorkers={savingWorkers}
        updateWorkers={updateWorkers}
        activeChannel={activeChannel}
        setActiveChannel={setActiveChannel}
        touchSeen={touchSeen}
        hasUnseen={hasUnseen}
        unreadByTaskThread={unreadByTaskThread}
        refreshing={refreshing}
        onRefresh={fetchTask}
        visibleFiles={visibleFiles}
        getFileUrl={getFileUrl}
        openViewer={(f: TaskFile) => { setViewerFile(f); setViewerOpen(true); }}
        submitReview={submitReview}
        reviewState={reviewState}
        setReviewState={setReviewState}
        fileComments={fileComments}
        setFileComments={setFileComments}
        addFileComment={addFileComment}
        addingFileComment={addingFileComment}
        newComment={newComment}
        setNewComment={setNewComment}
        addComment={addComment}
        addingComment={addingComment}
        deleteComment={deleteComment}
        forwardComment={forwardComment}
        forwardFile={forwardFile}
        deleteFile={deleteFile}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        uploadFiles={uploadFiles}
        uploadingFile={uploadingFile}
        fileInputRef={fileInputRef}
        updateStatus={updateStatus}
        approveCompletion={approveCompletion}
        requestCompletion={requestCompletion}
      />
      <FileViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} file={viewerFile} />
    </>
  );
};

export default TaskDetailPage;
