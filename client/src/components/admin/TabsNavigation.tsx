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

const TabsNavigation: React.FC<TabsNavigationProps> = ({ activeTab, setActiveTab, counts, colors }) => {
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

          return (
            <div key={tab} className="p-1 bg-white border border-gray-200 shadow-sm rounded-xl">
              <button
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? "text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                style={activeTab === tab ? { backgroundColor: colors.primary } : {}}
              >
                {label}
                {showCount && ` (${counts[tab]})`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabsNavigation;