import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";

export interface MobileTabItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface MobileTabBarProps {
  items: MobileTabItem[];
  /** Opens the full navigation sheet for everything else. */
  onMore: () => void;
  moreActive?: boolean;
}

function Pill({ active, Icon, label }: { active: boolean; Icon: LucideIcon; label: string }) {
  return (
    <>
      <span
        className={`flex h-9 w-[58px] items-center justify-center rounded-2xl transition-all duration-200 ${
          active
            ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
            : "text-[var(--color-text-muted)] group-active:bg-[var(--color-surface-2)]"
        }`}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} />
      </span>
      <span className={`text-[0.625rem] font-semibold leading-none ${active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
        {label}
      </span>
    </>
  );
}

/** Modern native-style bottom tab bar (mobile only). */
export default function MobileTabBar({ items, onMore, moreActive }: MobileTabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-2xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-1 pt-1.5">
        {items.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className="group flex flex-1 flex-col items-center gap-1 py-1">
            {({ isActive }) => <Pill active={isActive} Icon={icon} label={label} />}
          </NavLink>
        ))}
        <button type="button" onClick={onMore} className="group flex flex-1 flex-col items-center gap-1 py-1" aria-label="Open menu">
          <Pill active={!!moreActive} Icon={Menu} label="Menu" />
        </button>
      </div>
    </nav>
  );
}
