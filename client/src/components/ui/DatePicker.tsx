import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CONTROL_INPUT } from "./controls";

const DAYS_HEADER = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

function toDate(value: string): Date {
  if (!value) return new Date();
  const d = new Date(value + "T12:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: Date[] = [];
  for (let i = 0; i < startPad; i++) {
    days.push(new Date(0));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function toYYYYMMDD(d: Date): string {
  if (!d.getTime()) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Render calendar in portal (avoids clipping in modals) */
  usePortal?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "yyyy/mm/dd",
  className = "",
  id,
  disabled = false,
  usePortal = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => toDate(value));
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });

  const valueDate = toDate(value);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  useEffect(() => {
    if (value) setViewDate(toDate(value));
  }, [value]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((e.target as Element)?.closest?.('[data-datepicker-dropdown]')) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (d: Date) => {
    if (!d.getTime()) return;
    onChange(toYYYYMMDD(d));
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1));
  const nextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1));

  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const days = getDaysInMonth(viewYear, viewMonth);
  const today = new Date();

  const calendarContent = (
    <div
      data-datepicker-dropdown
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-xl shadow-black/25 p-4 min-w-[280px]"
      style={
        usePortal
          ? {
              position: "fixed" as const,
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{monthName}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {DAYS_HEADER.map((day) => (
          <div
            key={day}
            className="flex h-8 items-center justify-center text-xs font-medium text-[var(--color-text-muted)]"
          >
            {day}
          </div>
        ))}
        {days.map((d, i) => {
          const isEmpty = !d.getTime();
          const isSelected = !isEmpty && isSameDay(d, valueDate);
          const isToday = !isEmpty && isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              disabled={isEmpty}
              onClick={() => handleSelect(d)}
              className={`
                flex h-9 w-full items-center justify-center rounded-full text-sm transition
                ${isEmpty ? "invisible" : "cursor-pointer"}
                ${isSelected ? "bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] font-semibold" : ""}
                ${!isSelected && isToday ? "ring-1 ring-[var(--color-border)] text-[var(--color-text-primary)]" : ""}
                ${!isSelected && !isToday ? "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]" : ""}
              `}
            >
              {isEmpty ? "" : d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${CONTROL_INPUT} w-full flex items-center justify-between gap-2 text-left cursor-pointer ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose date"
      >
        <span className={value ? "text-[var(--color-text-primary)]" : "text-[var(--color-placeholder)]"}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
      </button>
      {open &&
        (usePortal
          ? createPortal(calendarContent, document.body)
          : (
            <div className="absolute left-0 top-full z-[100] mt-1.5">
              {calendarContent}
            </div>
          ))}
    </div>
  );
};

export default DatePicker;
