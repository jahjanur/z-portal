import React from "react";

interface TabsNavigationProps {
  activeTab: "workers" | "clients" | "tasks" | "invoices" | "domains" | "offers" | "timesheets";
  setActiveTab: (tab: "workers" | "clients" | "tasks" | "invoices" | "domains" | "offers" | "timesheets") => void;
  counts: {
    workers: number;
    clients: number;
    tasks: number;
    invoices: number;
    domains: number;
    offers?: number | null;
    timesheets?: number | null;
  };
  colors: { primary: string };
}

const TABS = ["workers", "clients", "tasks", "invoices", "domains", "offers", "timesheets"] as const;

const TabsNavigation: React.FC<TabsNavigationProps> = ({ activeTab, setActiveTab, counts }) => {
  return (
    <nav
      className="mb-8 w-full"
      aria-label="Dashboard sections"
    >
      <div className="overflow-x-auto">
        <div
          className="inline-flex min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 shadow-sm"
          role="tablist"
        >
          {TABS.map((tab) => {
            const showCount = counts[tab] != null && tab !== "offers" && tab !== "timesheets";
            const label =
              tab === "offers"
                ? "Send Offer"
                : tab === "timesheets"
                  ? "Timesheets"
                  : tab.charAt(0).toUpperCase() + tab.slice(1);
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab}`}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`
                  relative shrink-0 rounded-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-all
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                  ${isActive
                    ? "border-[var(--color-text-primary)] bg-[var(--color-surface-1)] text-[var(--color-text-primary)] shadow-sm"
                    : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                  }
                `}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {label}
                  {showCount && (
                    <span
                      className={`
                        min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums
                        ${isActive
                          ? "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"
                          : "bg-[var(--color-surface-3)]/80 text-[var(--color-text-muted)]"
                        }
                      `}
                    >
                      {counts[tab]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TabsNavigation;
