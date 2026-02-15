import React from "react";
import Offers from "../../components/Offers";

export default function AdminSendOfferPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="rounded-2xl card-panel p-6 shadow-xl backdrop-blur-xl">
        <Offers />
      </div>
    </div>
  );
}
