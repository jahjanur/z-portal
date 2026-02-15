import React from "react";
import Timesheet from "../../components/Timesheet";

export default function AdminTimesheetsPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-6 shadow-xl backdrop-blur-xl">
        <Timesheet />
      </div>
    </div>
  );
}
