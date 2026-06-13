import React from "react";
import { getFileUrl } from "../../api";

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  section: string | null;
  taskTitle: string;
}

interface FilesBySectionProps {
  files: Array<TaskFile & { taskTitle: string }>;
  /** Legacy prop — superseded by design tokens; kept for API compatibility */
  primaryColor: string;
}

const FilesBySection: React.FC<FilesBySectionProps> = ({ files }) => {
  const sections = Array.from(new Set(files.map((f) => f.section || "Uncategorized")));

  return (
    <div className="card-panel p-5 sm:p-6">
      <h3 className="section-title mb-5">Files by Section</h3>
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionFiles = files.filter((f) => (f.section || "Uncategorized") === section);
          return (
            <div
              key={section}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {section}
                </h4>
                <span className="badge shrink-0">{sectionFiles.length} files</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {sectionFiles.map((file) => (
                  <div
                    key={file.id}
                    className="row-hover flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {file.fileName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {file.taskTitle}
                      </p>
                    </div>
                    <a
                      href={getFileUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary shrink-0 rounded-full px-3 py-1 text-xs"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilesBySection;
