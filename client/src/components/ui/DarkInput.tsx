import React from "react";
import { CONTROL_INPUT, CONTROL_SELECT, CONTROL_TEXTAREA } from "./controls";

export const DarkInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(({ className = "", ...props }, ref) => (
  <input ref={ref} className={`${CONTROL_INPUT} ${className}`} {...props} />
));
DarkInput.displayName = "DarkInput";

export const DarkSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
>(({ className = "", children, ...props }, ref) => (
  <select ref={ref} className={`${CONTROL_SELECT} ${className}`} {...props}>
    {children}
  </select>
));
DarkSelect.displayName = "DarkSelect";

export const DarkTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${CONTROL_TEXTAREA} ${className}`} {...props} />
));
DarkTextarea.displayName = "DarkTextarea";

export default { DarkInput, DarkSelect, DarkTextarea };
