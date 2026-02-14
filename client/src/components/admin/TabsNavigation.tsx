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

const TabsNavigation: React.FC<TabsNavigationProps> = ({ activeTab, setActiveTab, counts }) => {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex flex-wrap gap-2">
        {(["workers", "clients", "tasks", "invoices", "domains", "offers", "timesheets"] as const).map((tab) => {
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
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "border border-white/10 bg-white/5 text-white/70 hover:border-white/15 hover:bg-white/10 hover:text-white/90"
              }`}
            >
              {label}
              {showCount && ` (${counts[tab]})`}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabsNavigation;
