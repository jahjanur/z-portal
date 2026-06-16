import { useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { X, LogOut, Bell, ChevronRight } from "lucide-react";

export interface SheetItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}
export interface SheetSection {
  label: string;
  items: SheetItem[];
}

interface MobileNavSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sections: SheetSection[];
  /** Unread notification count shown on the top Alerts button. */
  alertCount?: number;
}

/**
 * Premium bottom sheet for mobile navigation. Slides up from the bottom with
 * the Zulbera logo + alerts pinned to the top, grouped nav sections, and a
 * single log-out action at the foot. Replaces the legacy side drawer.
 */
export default function MobileNavSheet({ open, onClose, title, subtitle, sections, alertCount = 0 }: MobileNavSheetProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end md:hidden" role="dialog" aria-modal="true">
      {/* backdrop */}
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm animate-fade-in" />

      {/* sheet */}
      <div
        className="relative max-h-[88dvh] overflow-hidden rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-elev-lg animate-slide-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex justify-center pt-2.5"><span className="h-1.5 w-10 rounded-full bg-[var(--color-border-hover)]" /></div>

        {/* top bar: logo + alerts + close */}
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
          <img src="/Zulbera-Text-Logo.svg" alt="Zulbera" className="h-6 w-auto max-w-[120px] object-contain" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); navigate("/notifications"); }}
              aria-label="Alerts"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
              {alertCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* identity */}
        <div className="flex items-center gap-3 px-5 pb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-nav-active-bg)] text-base font-extrabold text-[var(--color-nav-active-text)]">
            {title.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-[var(--color-text-primary)]">{title}</p>
            {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          </div>
        </div>

        {/* nav */}
        <div className="max-h-[54dvh] overflow-y-auto px-3 pb-2">
          {sections.map((section) => (
            <div key={section.label} className="mb-1.5">
              <p className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{section.label}</p>
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                {section.items.map((it, i) => (
                  <NavLink
                    key={it.path}
                    to={it.path}
                    end={it.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium ${i > 0 ? "border-t border-[var(--color-border)]" : ""} ${
                        isActive ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)]" : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]"}`}>
                          <it.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                        </span>
                        <span className="flex-1">{it.label}</span>
                        {it.badge ? (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {it.badge > 99 ? "99+" : it.badge}
                          </span>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-50" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* log out */}
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] py-3 text-sm font-semibold text-[var(--color-destructive-text)]">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
