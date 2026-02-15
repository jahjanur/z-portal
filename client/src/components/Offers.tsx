import React, { useState } from "react";
import axios from "axios";
import { generateOfferProposalPdf } from "../utils/pdf/generateOfferProposalPdf";

const CONTROL =
  "h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]";

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
      alert("Please fill in all required fields including email!");
      return;
    }
    setLoading(true);
    try {
      const totalPrice = products.reduce((s, p) => s + (p.price || 0), 0);
      await axios.post("/api/offers/send-offer", {
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
      alert("Offer PDF sent successfully!");
      setClientName("");
      setRecipientEmail("");
      setPageTitle("");
      setDescription("");
      setProducts([{ id: "1", name: "", price: undefined, timeline: "", techStack: "" }]);
    } catch (err) {
      console.error("Error sending offer PDF:", err);
      alert("Failed to send offer. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!clientName || !pageTitle || !description) {
      alert("Please fill in all required fields!");
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
      alert("Failed to download PDF. Check console for details.");
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
      className="mx-auto max-w-3xl space-y-8"
    >
      <header className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Create & Send Offer
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Client info, offer details, and line items
        </p>
      </header>

      {/* Client Info */}
      <section
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6"
        aria-labelledby="client-heading"
      >
        <h3 id="client-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Client Information
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            placeholder="Client Name *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={CONTROL}
          />
          <input
            type="email"
            placeholder="Client Email *"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className={CONTROL}
          />
          <input
            placeholder="Company (optional)"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
            className={CONTROL}
          />
          <input
            placeholder="Phone (optional)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={CONTROL}
          />
        </div>
      </section>

      {/* Offer Details */}
      <section
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6"
        aria-labelledby="offer-heading"
      >
        <h3 id="offer-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Offer Details
        </h3>
        <div className="space-y-4">
          <input
            placeholder="Project Title *"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className={CONTROL}
          />
          <textarea
            placeholder="Project Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${CONTROL} min-h-[100px] resize-y py-3`}
          />
          <textarea
            placeholder="What we need (optional — shown in PDF when filled)"
            value={whatWeNeed}
            onChange={(e) => setWhatWeNeed(e.target.value)}
            rows={2}
            className={`${CONTROL} min-h-[60px] resize-y py-3`}
          />
          <textarea
            placeholder="Roadmap (optional — shown in PDF when filled)"
            value={roadmap}
            onChange={(e) => setRoadmap(e.target.value)}
            rows={2}
            className={`${CONTROL} min-h-[60px] resize-y py-3`}
          />
          <textarea
            placeholder="Why to invest (optional — shown on last page when filled)"
            value={whyToInvest}
            onChange={(e) => setWhyToInvest(e.target.value)}
            rows={2}
            className={`${CONTROL} min-h-[60px] resize-y py-3`}
          />
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="products-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="products-heading" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Products
          </h3>
          <button
            type="button"
            onClick={addProduct}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
          >
            + Add row
          </button>
        </div>

        <div className="space-y-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="flex flex-1 flex-wrap items-center gap-3 sm:flex-row">
                <input
                  placeholder="Name"
                  value={product.name}
                  onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                  className={`${CONTROL} sm:max-w-[180px]`}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={product.price ?? ""}
                  onChange={(e) =>
                    updateProduct(product.id, "price", e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={`${CONTROL} sm:max-w-[100px]`}
                />
                <input
                  placeholder="Timeline"
                  value={product.timeline}
                  onChange={(e) => updateProduct(product.id, "timeline", e.target.value)}
                  className={`${CONTROL} sm:max-w-[120px]`}
                />
                <input
                  placeholder="Tech (comma-separated)"
                  value={product.techStack}
                  onChange={(e) => updateProduct(product.id, "techStack", e.target.value)}
                  className={`${CONTROL} min-w-0 flex-1 sm:min-w-[140px]`}
                />
              </div>
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  className="shrink-0 self-start rounded p-2 text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)] sm:self-center"
                  aria-label={`Remove product ${index + 1}`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 rounded-lg border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Total</span>
            <span className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg border border-[var(--color-btn-primary-border)] bg-[var(--color-btn-primary-bg)] px-4 text-sm font-semibold text-[var(--color-btn-primary-text)] transition-colors hover:border-[var(--color-btn-primary-hover-border)] hover:bg-[var(--color-btn-primary-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send Offer via Email"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={downloadPDF}
          className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : "Download as PDF"}
        </button>
      </div>
    </form>
  );
};

export default Offers;
