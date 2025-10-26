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
  const fullUrl = `http://localhost:4000${file.fileUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {isImage && (
          <img
            src={fullUrl}
            alt={file.fileName}
            className="object-contain max-w-full max-h-full rounded-lg"
          />
        )}

        <button
          onClick={onClose}
          className="absolute p-2 text-white bg-black bg-opacity-50 rounded-full top-2 right-2 hover:bg-opacity-75"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default FileViewer;
