import React from "react";

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
  primaryColor: string;
}

const FileCard: React.FC<FileCardProps> = ({ file, formatDate }) => {
  return (
    <div
      className="p-4 transition-all border rounded-xl backdrop-blur-sm hover:border-white/15"
      style={{
        backgroundColor: "rgba(42, 42, 42, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg bg-white/10">
          {file.fileType === "screenshot" ? (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{file.fileName}</p>
          <p className="mt-1 text-xs text-gray-500">{file.section || "Uncategorized"}</p>
          <p className="mt-1 text-xs text-gray-500">{formatDate(file.uploadedAt)}</p>
          <p className="mt-2 text-xs font-medium text-gray-500">Project: {file.taskTitle}</p>
        </div>
      </div>
      <a
        href={`http://localhost:4001${file.fileUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full px-3 py-2 mt-3 text-xs font-semibold text-center rounded-full bg-white text-app hover:bg-gray-200 transition-all"
      >
        View File
      </a>
    </div>
  );
};

export default FileCard;
