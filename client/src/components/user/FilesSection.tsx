import React from "react";

interface TaskFile {
  id: number;
  fileName: string;
  fileUrl: string;
  section: string | null;
  taskTitle: string;
}

interface FilesBySectionProps {
  files: Array<TaskFile & { taskTitle: string }>;
  primaryColor: string;
}

const FilesBySection: React.FC<FilesBySectionProps> = ({ files, primaryColor }) => {
  const sections = Array.from(new Set(files.map((f) => f.section || "Uncategorized")));

  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Files by Section</h3>
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionFiles = files.filter((f) => (f.section || "Uncategorized") === section);
          return (
            <div key={section} className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-gray-900">{section}</h4>
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {sectionFiles.length} files
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {sectionFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                      <p className="text-xs text-gray-500">{file.taskTitle}</p>
                    </div>
                    <a
                      href={`http://localhost:4000${file.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
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