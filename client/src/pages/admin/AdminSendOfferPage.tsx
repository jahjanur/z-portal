import Offers from "../../components/Offers";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminSendOfferPage() {
  return (
    <div className="mx-auto max-w-[1200px] w-full max-w-full min-w-0 space-y-6">
      <PageHeader
        title="Send Offer"
        subtitle="Create a proposal, download it as PDF or send it by email"
      />
      <div className="card-panel rounded-2xl p-5 sm:p-6 animate-fade-up">
        <Offers />
      </div>
    </div>
  );
}
