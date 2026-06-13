import React, { useEffect, useRef, useState } from "react";
import { X, Download, FileText } from "lucide-react";
import { renderAsync } from "docx-preview";
import { getFileUrl } from "../api";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";

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

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

const FileViewer: React.FC<FileViewerProps> = ({ isOpen, onClose, file }) => {
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const ext = file ? getExtension(file.fileName) : "";
  const fullUrl = file ? getFileUrl(file.fileUrl) : "";

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isPdf = ext === "pdf";
  const isDocx = ext === "docx" || ext === "doc";
  const isText = ["txt", "csv", "json", "md", "xml", "html", "htm", "yaml", "yml"].includes(ext);

  // Reset state when file changes
  useEffect(() => {
    setDocxError(null);
    setTextContent(null);
    if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
  }, [file?.id]);

  // Render docx into the container ref using docx-preview
  useEffect(() => {
    if (!isOpen || !file || !isDocx || !docxContainerRef.current) return;

    setDocxLoading(true);
    setDocxError(null);

    fetch(fullUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
        return res.arrayBuffer();
      })
      .then((buffer) =>
        renderAsync(buffer, docxContainerRef.current!, undefined, {
          className: "docx-render",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        })
      )
      .catch((err) => setDocxError(err?.message ?? "Failed to render document"))
      .finally(() => setDocxLoading(false));
  }, [isOpen, file?.id, isDocx, fullUrl]);

  // Load plain text content
  useEffect(() => {
    if (!isOpen || !file || !isText) return;

    fetch(fullUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
        return res.text();
      })
      .then(setTextContent)
      .catch(() => setTextContent("Could not load file content."));
  }, [isOpen, file?.id, isText, fullUrl]);

  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-panel relative flex flex-col overflow-hidden shadow-elev-lg animate-scale-in"
        style={{ width: "min(92vw, 900px)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.fileName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {file.fileType} • {new Date(file.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={fullUrl}
              download={file.fileName}
              className="btn-ghost h-9 px-3 text-xs"
            >
              <Download size={13} />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost h-9 w-9 !px-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Image */}
          {isImage && (
            <div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--color-surface-1)] p-4">
              <img
                src={fullUrl}
                alt={file.fileName}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-elev-md"
              />
            </div>
          )}

          {/* PDF */}
          {isPdf && (
            <iframe
              src={fullUrl}
              title={file.fileName}
              className="flex-1 border-0"
              style={{ minHeight: "70vh" }}
            />
          )}

          {/* DOCX / DOC */}
          {isDocx && (
            <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-surface-2)]">
              {docxLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-[var(--color-overlay)] text-[var(--color-text-primary)]">
                  <Spinner size="md" />
                  <span className="text-sm font-medium">Rendering document...</span>
                </div>
              )}
              {docxError && (
                <div className="flex flex-1 items-center justify-center p-5">
                  <EmptyState
                    compact
                    className="w-full max-w-md !border-0 !shadow-none"
                    icon={<FileText size={24} />}
                    title="Could not render document"
                    description={docxError}
                    action={
                      <a href={fullUrl} download={file.fileName} className="btn-secondary h-9 px-3 text-xs">
                        <Download size={14} /> Download to view
                      </a>
                    }
                  />
                </div>
              )}
              <div
                ref={docxContainerRef}
                className="flex-1 overflow-auto"
                style={{ minHeight: "65vh" }}
              />
            </div>
          )}

          {/* Plain text / CSV / JSON / etc. */}
          {isText && (
            <div className="flex-1 overflow-auto bg-[var(--color-surface-2)] p-5">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {textContent ?? "Loading..."}
              </pre>
            </div>
          )}

          {/* Unsupported */}
          {!isImage && !isPdf && !isDocx && !isText && (
            <div className="flex flex-1 items-center justify-center p-5">
              <EmptyState
                compact
                className="w-full max-w-md !border-0 !shadow-none"
                icon={<FileText size={24} />}
                title="Preview not available"
                description={`Preview is not supported for .${ext} files.`}
                action={
                  <a href={fullUrl} download={file.fileName} className="btn-secondary h-9 px-3 text-xs">
                    <Download size={14} /> Download to view
                  </a>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* docx-preview injects its own styles; this just ensures pages centre nicely */}
      <style>{`
        .docx-render { padding: 24px; }
        .docx-render section.docx { margin: 0 auto 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.18); }
      `}</style>
    </div>
  );
};

export default FileViewer;
