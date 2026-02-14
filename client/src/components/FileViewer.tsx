import React from "react";
import { X } from "lucide-react";

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  } | null;
}

const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, file }) => {
  if (!isOpen || !file) return null;

  const isImage = file.fileType.startsWith("image/");
  const fullUrl = `http://localhost:4001${file.fileUrl}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={fullUrl}
            alt={file.fileName}
            className="max-h-full max-w-full rounded-2xl border border-white/10 object-contain shadow-xl"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default FileViewer;
