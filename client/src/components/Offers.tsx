import React, { useState } from "react";
import axios from "axios";

const colors = {
  primary: "#5B4FFF",
  secondary: "#7C73FF",
  accent: "#FFA726",
  light: "#F8F9FA",
  dark: "#1A1A2E",
};

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
  const [pageTitle, setPageTitle] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "", price: undefined, timeline: "", techStack: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: "",
      price: undefined,
      timeline: "",
      techStack: "",
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p: Product) => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: unknown) => {
    setProducts(
      products.map((p: Product) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const sendOfferByEmail = async () => {
    if (!recipientEmail || !clientName || !pageTitle || !description) {
      alert("Please fill in all required fields including email!");
      return;
    }

    setLoading(true);
    try {
      const totalPrice = products.reduce(
        (sum: number, p: Product) => sum + (p.price || 0),
        0
      );

      await axios.post("/api/offers/send-offer", {
        clientName,
        clientEmail: recipientEmail,
        pageTitle,
        description,
        products: products.map((p: Product) => ({
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
      setProducts([
        { id: "1", name: "", price: undefined, timeline: "", techStack: "" },
      ]);
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
      const totalPrice = products.reduce(
        (sum: number, p: Product) => sum + (p.price || 0),
        0
      );

      const response = await axios.post(
        "/api/offers/download",
        {
          clientName,
          clientEmail: recipientEmail,
          pageTitle,
          description,
          products: products.map((p: Product) => ({
            name: p.name,
            price: p.price,
            timeline: p.timeline,
            techStack: p.techStack.split(",").map((t: string) => t.trim()),
          })),
          totalPrice,
        },
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${clientName.replace(/\s+/g, "_")}_offer.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download PDF. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        sendOfferByEmail();
      }}
      className="max-w-4xl p-8 mx-auto bg-white border border-gray-100 shadow-xl rounded-2xl"
    >
      <h2 className="mb-8 text-3xl font-extrabold text-center text-gray-900">
        Create & Send Offer
      </h2>

      {/* Client Information Section */}
      <div className="p-6 mb-6 border border-gray-200 rounded-xl bg-gray-50">
        <h3 className="mb-4 text-lg font-semibold text-gray-700">
          Client Information
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            placeholder="Client Name *"
            value={clientName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            placeholder="Client Email *"
            type="email"
            value={recipientEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientEmail(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Offer Details Section */}
      <div className="p-6 mb-6 border border-gray-200 rounded-xl bg-gray-50">
        <h3 className="mb-4 text-lg font-semibold text-gray-700">
          Offer Details
        </h3>
        <input
          placeholder="Project Title *"
          value={pageTitle}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageTitle(e.target.value)}
          className="w-full px-4 py-3 mb-4 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <textarea
          placeholder="Project Description *"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          rows={5}
        />
      </div>

      {/* Products Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Products</h3>
          <button
            type="button"
            onClick={addProduct}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg hover:shadow-md"
            style={{
              background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
            }}
          >
            <span className="text-lg">+</span> Add Product
          </button>
        </div>

        {products.map((product: Product, index: number) => (
          <div
            key={product.id}
            className="relative p-6 mb-4 border border-gray-200 rounded-xl bg-gray-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-600">
                Product {index + 1}
              </h4>
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  className="text-red-500 transition-colors hover:text-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                placeholder="Product Name"
                value={product.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateProduct(product.id, "name", e.target.value)
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="number"
                placeholder="Price"
                value={product.price || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateProduct(
                    product.id,
                    "price",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                placeholder="Timeline (e.g., 2 weeks)"
                value={product.timeline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateProduct(product.id, "timeline", e.target.value)
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                placeholder="Tech Stack (comma separated)"
                value={product.techStack}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateProduct(product.id, "techStack", e.target.value)
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
        ))}

        {/* Total Price Display */}
        <div className="p-4 mt-4 border-2 border-gray-300 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">
              Total Price:
            </span>
            <span className="text-2xl font-bold" style={{ color: colors.primary }}>
              ${products.reduce((sum: number, p: Product) => sum + (p.price || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 text-sm font-semibold text-white transition-all rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
          }}
        >
          {loading ? "Sending Offer..." : "Send Offer via Email"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={downloadPDF}
          className="w-full px-6 py-4 text-sm font-semibold text-white transition-all rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${colors.accent}, ${colors.primary})`,
          }}
        >
          {loading ? "Generating PDF..." : "Download Offer as PDF"}
        </button>
      </div>
    </form>
  );
};

export default Offers;