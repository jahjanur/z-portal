import Timesheet from "../../components/Timesheet";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminTimesheetsPage() {
  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="Timesheets"
        subtitle="Track project hours, rates and payouts"
      />
      <div className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
        <Timesheet />
      </div>
    </div>
  );
}
