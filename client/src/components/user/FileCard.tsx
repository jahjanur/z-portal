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

const FileCard: React.FC<FileCardProps> = ({ file, formatDate, primaryColor }) => {
  return (
    <div className="p-4 transition-all border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
          {file.fileType === "screenshot" ? (
            <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{file.fileName}</p>
          <p className="mt-1 text-xs text-gray-500">{file.section || "Uncategorized"}</p>
          <p className="mt-1 text-xs text-gray-400">{formatDate(file.uploadedAt)}</p>
          <p className="mt-2 text-xs font-medium text-gray-600">Project: {file.taskTitle}</p>
        </div>
      </div>
      <a
        href={`http://localhost:4000${file.fileUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full px-3 py-2 mt-3 text-xs font-semibold text-center text-white transition-opacity rounded-lg hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        View File
      </a>
    </div>
  );
};

export default FileCard;