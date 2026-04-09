import React, { useEffect, useRef, useState } from "react";
import { X, Download, FileText, Loader2 } from "lucide-react";
import { renderAsync } from "docx-preview";
import { getFileUrl } from "../api";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col rounded-2xl border border-white/10 bg-[var(--color-surface-2)] shadow-2xl"
        style={{ width: "min(92vw, 900px)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.fileName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {file.fileType} • {new Date(file.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <a
              href={fullUrl}
              download={file.fileName}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-white/10"
            >
              <Download size={13} />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-b-2xl">
          {/* Image */}
          {isImage && (
            <div className="flex flex-1 items-center justify-center overflow-auto bg-black/20 p-4">
              <img
                src={fullUrl}
                alt={file.fileName}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          )}

          {/* PDF */}
          {isPdf && (
            <iframe
              src={fullUrl}
              title={file.fileName}
              className="flex-1 border-0 rounded-b-2xl"
              style={{ minHeight: "70vh" }}
            />
          )}

          {/* DOCX / DOC */}
          {isDocx && (
            <div className="flex flex-1 flex-col overflow-hidden rounded-b-2xl bg-[#f0f0f0]">
              {docxLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/30 text-white">
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-sm font-medium">Rendering document...</span>
                </div>
              )}
              {docxError && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                  <FileText size={40} className="text-gray-400" />
                  <p className="text-sm text-red-500">{docxError}</p>
                  <a
                    href={fullUrl}
                    download={file.fileName}
                    className="flex items-center gap-2 rounded-full bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    <Download size={14} /> Download to view
                  </a>
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
            <div className="flex-1 overflow-auto rounded-b-2xl bg-[#0d0d0d] p-5">
              <pre className="text-xs leading-relaxed text-gray-300 whitespace-pre-wrap break-words font-mono">
                {textContent ?? "Loading..."}
              </pre>
            </div>
          )}

          {/* Unsupported */}
          {!isImage && !isPdf && !isDocx && !isText && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-14 text-center">
              <FileText size={48} className="text-[var(--color-text-muted)]" />
              <p className="text-[var(--color-text-muted)]">
                Preview not available for{" "}
                <span className="font-semibold uppercase">.{ext}</span> files
              </p>
              <a
                href={fullUrl}
                download={file.fileName}
                className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Download size={15} />
                Download to view
              </a>
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
