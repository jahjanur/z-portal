import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  className?: string;
}

const maxWidthClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "4xl": "sm:max-w-4xl",
};

/**
 * Modal dialog.
 * Desktop: centered card with scale-in animation.
 * Mobile (<640px): bottom sheet sliding up, full width, rounded top corners.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
  className = "",
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      aria-label="Close"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--color-overlay)] backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={panelRef}
        className={`relative flex w-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-panel-solid)] shadow-elev-lg
          max-h-[92dvh] rounded-t-2xl animate-slide-up
          sm:max-h-[90vh] sm:max-w-[95vw] sm:rounded-2xl sm:animate-scale-in ${maxWidthClasses[maxWidth]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-hover)]" />
        </div>
        {title !== undefined ? (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <div id="modal-title" className="min-w-0 truncate text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </div>
            {closeButton}
          </div>
        ) : (
          <div className="absolute top-2.5 right-3 z-10 sm:top-3">{closeButton}</div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 safe-bottom sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
