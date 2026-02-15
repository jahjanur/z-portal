import React, { useState, useRef, useEffect } from "react";
import { CONTROL_INPUT } from "./controls";

interface User {
  id: number;
  name: string;
  email?: string;
}

interface WorkerMultiSelectProps {
  workers: User[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  className?: string;
  /** If true, applying selection closes dropdown and no explicit Apply needed (e.g. for TaskForm). */
  autoApply?: boolean;
}

const WorkerMultiSelect: React.FC<WorkerMultiSelectProps> = ({
  workers,
  value,
  onChange,
  placeholder = "Assign workers (optional)",
  className = "",
  autoApply = true,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<number[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPending(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!autoApply) {
          setPending(value);
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autoApply, value]);

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.email && w.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: number) => {
    const next = pending.includes(id) ? pending.filter((x) => x !== id) : [...pending, id];
    setPending(next);
    if (autoApply) {
      onChange(next);
    }
  };

  const handleClear = () => {
    setPending([]);
    if (autoApply) {
      onChange([]);
    }
  };

  const handleApply = () => {
    onChange(pending);
    setOpen(false);
  };

  const selectedUsers = workers.filter((w) => value.includes(w.id));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${CONTROL_INPUT} flex cursor-pointer items-center justify-between gap-2 text-left`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {selectedUsers.length === 0
            ? placeholder
            : selectedUsers.map((u) => u.name).join(", ")}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 min-w-[240px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--color-card-shadow)]"
          role="listbox"
        >
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No workers match</p>
            ) : (
              filtered.map((w) => {
                const checked = pending.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(w.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-3)]"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--color-border)] ${
                        checked ? "bg-[var(--color-text-primary)]" : "bg-transparent"
                      }`}
                    >
                      {checked && (
                        <svg className="h-3 w-3 text-[var(--color-bg)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate text-[var(--color-text-primary)]">{w.name}</span>
                    {w.email && (
                      <span className="truncate text-xs text-[var(--color-text-muted)]">{w.email}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] p-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
            >
              Clear
            </button>
            {!autoApply && (
              <button
                type="button"
                onClick={handleApply}
                className="btn-primary rounded-lg px-3 py-1.5 text-sm font-semibold"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]"
            >
              {u.name}
              {autoApply && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((id) => id !== u.id))}
                  className="rounded-full p-0.5 transition-colors hover:bg-[var(--color-surface-2)]"
                  aria-label={`Remove ${u.name}`}
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerMultiSelect;
