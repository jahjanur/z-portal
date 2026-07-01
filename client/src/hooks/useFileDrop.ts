import { useRef, useState } from "react";

/**
 * Drag-and-drop file support for any container. Spread the returned
 * `dropHandlers` onto an element and read `dragging` to show a highlight.
 * Dropped files are passed to `onFiles`.
 */
export function useFileDrop(
  onFiles: (files: File[]) => void,
  opts?: { multiple?: boolean; disabled?: boolean }
) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const multiple = opts?.multiple ?? true;
  const disabled = opts?.disabled ?? false;

  const reset = () => { depth.current = 0; setDragging(false); };

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (disabled) return;
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault(); e.stopPropagation();
      depth.current += 1; setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (disabled) return;
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault(); e.stopPropagation();
      depth.current -= 1;
      if (depth.current <= 0) reset();
    },
    onDrop: (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault(); e.stopPropagation();
      reset();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
  };

  return { dragging, dropHandlers };
}
