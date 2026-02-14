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

const cardStyle = {
  backgroundColor: "rgba(42, 42, 42, 0.8)",
  borderColor: "rgba(255, 255, 255, 0.08)",
};

const FilesBySection: React.FC<FilesBySectionProps> = ({ files }) => {
  const sections = Array.from(new Set(files.map((f) => f.section || "Uncategorized")));

  return (
    <div className="p-6 border rounded-2xl backdrop-blur-sm" style={cardStyle}>
      <h3 className="mb-6 text-xl font-bold text-white">Files by Section</h3>
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionFiles = files.filter((f) => (f.section || "Uncategorized") === section);
          return (
            <div
              key={section}
              className="p-4 border rounded-xl border-border-subtle"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-white">{section}</h4>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/10 text-gray-300">
                  {sectionFiles.length} files
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {sectionFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border-subtle"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.fileName}</p>
                      <p className="text-xs text-gray-500">{file.taskTitle}</p>
                    </div>
                    <a
                      href={`http://localhost:4001${file.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-white text-app hover:bg-gray-200 transition-all"
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
