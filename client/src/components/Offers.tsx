import React, { useState } from "react";
import toast from "react-hot-toast";
import API from "../api";
import { generateOfferProposalPdf } from "../utils/pdf/generateOfferProposalPdf";
import { TechStackSelector } from "./TechStackSelector";
import Button from "./ui/Button";
import { CONTROL_INPUT, CONTROL_TEXTAREA } from "./ui/controls";

interface Product {
  id: string;
  name: string;
  price: number | undefined;
  timeline: string;
  techStack: string;
}

const Offers: React.FC = () => {
  const [clientName, setClientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whatWeNeed, setWhatWeNeed] = useState("");
  const [roadmap, setRoadmap] = useState("");
  const [whyToInvest, setWhyToInvest] = useState("");
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "", price: undefined, timeline: "", techStack: "" },
  ]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        price: undefined,
        timeline: "",
        techStack: "",
      },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: unknown) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const sendOfferByEmail = async () => {
    if (!recipientEmail || !clientName || !pageTitle || !description) {
      toast.error("Please fill in all required fields including email!");
      return;
    }
    setLoading(true);
    try {
      const totalPrice = products.reduce((s, p) => s + (p.price || 0), 0);
      await API.post("/api/offers/send-offer", {
        clientName,
        clientEmail: recipientEmail,
        pageTitle,
        description,
        products: products.map((p) => ({
          name: p.name,
          price: p.price,
          timeline: p.timeline,
          techStack: p.techStack.split(",").map((t: string) => t.trim()),
        })),
        totalPrice,
      });
      toast.success("Offer PDF sent successfully!");
      setClientName("");
      setRecipientEmail("");
      setPageTitle("");
      setDescription("");
      setSelectedTechs([]);
      setProducts([{ id: "1", name: "", price: undefined, timeline: "", techStack: "" }]);
    } catch (err) {
      console.error("Error sending offer PDF:", err);
      toast.error("Failed to send offer. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!clientName || !pageTitle || !description) {
      toast.error("Please fill in all required fields!");
      return;
    }
    setLoading(true);
    try {
      const totalPrice = products.reduce((s, p) => s + (p.price || 0), 0);
      await generateOfferProposalPdf({
        clientName,
        clientEmail: recipientEmail || undefined,
        clientCompany: clientCompany || undefined,
        clientPhone: clientPhone || undefined,
        pageTitle,
        description,
        whatWeNeed: whatWeNeed || undefined,
        roadmap: roadmap || undefined,
        whyToInvest: whyToInvest || undefined,
        techStack: selectedTechs.length > 0 ? selectedTechs : undefined,
        products: products.map((p) => ({
          name: p.name,
          price: p.price,
          timeline: p.timeline,
          techStack: p.techStack.split(",").map((t: string) => t.trim()),
        })),
        totalPrice,
      });
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download PDF. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const total = products.reduce((s, p) => s + (p.price || 0), 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendOfferByEmail();
      }}
      className="mx-auto max-w-3xl space-y-6"
    >
      {/* Client Info */}
      <section className="card-panel rounded-2xl p-5 sm:p-6" aria-labelledby="client-heading">
        <h3 id="client-heading" className="section-title mb-4">
          Client Information
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            placeholder="Client Name *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={CONTROL_INPUT}
          />
          <input
            type="email"
            placeholder="Client Email *"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className={CONTROL_INPUT}
          />
          <input
            placeholder="Company (optional)"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
            className={CONTROL_INPUT}
          />
          <input
            placeholder="Phone (optional)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={CONTROL_INPUT}
          />
        </div>
      </section>

      {/* Offer Details */}
      <section className="card-panel rounded-2xl p-5 sm:p-6" aria-labelledby="offer-heading">
        <h3 id="offer-heading" className="section-title mb-4">
          Offer Details
        </h3>
        <div className="space-y-4">
          <input
            placeholder="Project Title *"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className={CONTROL_INPUT}
          />
          <textarea
            placeholder="Project Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${CONTROL_TEXTAREA} min-h-[100px] py-3`}
          />
          <textarea
            placeholder="What we need (optional — shown in PDF when filled)"
            value={whatWeNeed}
            onChange={(e) => setWhatWeNeed(e.target.value)}
            rows={2}
            className={`${CONTROL_TEXTAREA} min-h-[60px] py-3`}
          />
          <textarea
            placeholder="Roadmap (optional — shown in PDF when filled)"
            value={roadmap}
            onChange={(e) => setRoadmap(e.target.value)}
            rows={2}
            className={`${CONTROL_TEXTAREA} min-h-[60px] py-3`}
          />
          <textarea
            placeholder="Why to invest (optional — shown on last page when filled)"
            value={whyToInvest}
            onChange={(e) => setWhyToInvest(e.target.value)}
            rows={2}
            className={`${CONTROL_TEXTAREA} min-h-[60px] py-3`}
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="card-panel rounded-2xl p-5 sm:p-6" aria-labelledby="techstack-heading">
        <h3 id="techstack-heading" className="section-title">
          Tech Stack
        </h3>
        <p className="mt-1 mb-4 text-xs text-[var(--color-text-muted)]">
          Selected technologies will appear as logos in the PDF.
        </p>
        <TechStackSelector selected={selectedTechs} onChange={setSelectedTechs} />
      </section>

      {/* Products */}
      <section className="card-panel rounded-2xl p-5 sm:p-6" aria-labelledby="products-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 id="products-heading" className="section-title">
            Products
          </h3>
          <Button variant="secondary" size="sm" onClick={addProduct}>
            + Add row
          </Button>
        </div>

        <div className="space-y-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="grid grid-cols-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:grid-cols-[1fr_6.5rem_7.5rem_1fr_auto]"
            >
              <input
                placeholder="Name"
                value={product.name}
                onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                className={CONTROL_INPUT}
              />
              <input
                type="number"
                placeholder="Price (EUR)"
                value={product.price ?? ""}
                onChange={(e) =>
                  updateProduct(product.id, "price", e.target.value ? Number(e.target.value) : undefined)
                }
                className={CONTROL_INPUT}
              />
              <input
                placeholder="Timeline"
                value={product.timeline}
                onChange={(e) => updateProduct(product.id, "timeline", e.target.value)}
                className={CONTROL_INPUT}
              />
              <input
                placeholder="Tech (comma-separated)"
                value={product.techStack}
                onChange={(e) => updateProduct(product.id, "techStack", e.target.value)}
                className={CONTROL_INPUT}
              />
              {products.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  className="justify-self-end rounded-lg p-2 text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)]"
                  aria-label={`Remove product ${index + 1}`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              ) : (
                <span className="hidden w-9 sm:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Total (EUR)</span>
            <span className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6">
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? "Sending…" : "Send Offer via Email"}
        </Button>
        <Button variant="secondary" loading={loading} onClick={downloadPDF} className="w-full">
          {loading ? "Generating…" : "Download as PDF"}
        </Button>
      </div>
    </form>
  );
};

export default Offers;
