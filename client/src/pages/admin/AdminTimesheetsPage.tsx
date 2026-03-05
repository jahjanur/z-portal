import React from "react";
import Timesheet from "../../components/Timesheet";

export default function AdminTimesheetsPage() {
  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0">
      <div className="rounded-2xl card-panel p-6 shadow-xl">
        <Timesheet />
      </div>
    </div>
  );
}
