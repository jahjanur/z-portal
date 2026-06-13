import React from "react";
import { getFileUrl } from "../../api";

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  section: string | null;
  uploadedAt: string;
  taskTitle: string;
}

interface FileCardProps {
  file: TaskFile;
  formatDate: (date: string) => string;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const FileCard: React.FC<FileCardProps> = ({ file, formatDate }) => {
  return (
    <div className="card-panel card-panel-hover flex flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">
          {file.fileType === "screenshot" ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {file.fileName}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {file.section || "Uncategorized"} · {formatDate(file.uploadedAt)}
          </p>
          <p className="mt-1.5 truncate text-xs font-medium text-[var(--color-text-secondary)]">
            Project: {file.taskTitle}
          </p>
        </div>
      </div>
      <a
        href={getFileUrl(file.fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-4 w-full rounded-full px-3 py-1.5 text-center text-xs"
      >
        View File
      </a>
    </div>
  );
};

export default FileCard;
