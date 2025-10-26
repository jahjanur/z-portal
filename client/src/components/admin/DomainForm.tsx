import React, { useEffect, useState, useRef } from "react";

interface User {
  id: number;
  name: string;
  company?: string;
}

interface DomainFormProps {
  onSubmit: (domainData: {
    clientId: string;
    domainName: string;
    domainExpiry: string;
    hostingPlan: string;
    hostingExpiry: string;
  }) => Promise<void>;
  onUpdate: (domainId: number, domainData: {
    domainName: string;
    domainExpiry: string;
    hostingPlan: string;
    hostingExpiry: string;
  }) => Promise<void>;
  clients: User[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    light: string;
    dark: string;
  };
  editingDomain: {
    id: number;
    domainName: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    clientId: number;
  } | null;
  onCancelEdit: () => void;
}

const DomainForm: React.FC<DomainFormProps> = ({
  onSubmit,
  onUpdate,
  clients,
  colors,
  editingDomain,
  onCancelEdit,
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    clientId: "",
    domainName: "",
    domainExpiry: "",
    hostingPlan: "",
    hostingExpiry: "",
  });

  useEffect(() => {
    if (editingDomain && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editingDomain]);

  useEffect(() => {
    if (editingDomain) {
      setFormData({
        clientId: editingDomain.clientId.toString(),
        domainName: editingDomain.domainName,
        domainExpiry: editingDomain.domainExpiry ? editingDomain.domainExpiry.split('T')[0] : "",
        hostingPlan: editingDomain.hostingPlan || "",
        hostingExpiry: editingDomain.hostingExpiry ? editingDomain.hostingExpiry.split('T')[0] : "",
      });
    } else {
      setFormData({
        clientId: "",
        domainName: "",
        domainExpiry: "",
        hostingPlan: "",
        hostingExpiry: "",
      });
    }
  }, [editingDomain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setDefaultDates = () => {
    const today = new Date();
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    const formattedDate = oneYearFromNow.toISOString().split('T')[0];
    
    setFormData({
      ...formData,
      domainExpiry: formattedDate,
      hostingExpiry: formattedDate,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.domainName) {
      alert("Domain name is required.");
      return;
    }

    if (editingDomain) {
      await onUpdate(editingDomain.id, {
        domainName: formData.domainName,
        domainExpiry: formData.domainExpiry,
        hostingPlan: formData.hostingPlan,
        hostingExpiry: formData.hostingExpiry,
      });
      onCancelEdit();
    } else {
      if (!formData.clientId) {
        alert("Client is required.");
        return;
      }
      await onSubmit(formData);
      setFormData({ clientId: "", domainName: "", domainExpiry: "", hostingPlan: "", hostingExpiry: "" });
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent";

  return (
    <div 
      ref={formRef}
      className={`p-5 mb-6 border-2 rounded-xl transition-all ${
        editingDomain 
          ? 'border-blue-300 bg-blue-50 shadow-lg' 
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          {editingDomain ? "✏️ Edit Domain" : "Add New Domain"}
        </h3>
        {!editingDomain && (
          <button
              type="button"
              onClick={setDefaultDates}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white transition-opacity rounded-lg hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Set 1-Year Expiry
            </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!editingDomain && (
            <div>
              <label className="block mb-2 text-xs font-semibold text-gray-600">Select Client *</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className={inputClass}
                style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-600">Domain Name *</label>
            <input
              type="text"
              name="domainName"
              value={formData.domainName}
              onChange={handleChange}
              placeholder="example.com"
              className={inputClass}
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-600">Domain Expiry Date</label>
            <input
              type="date"
              name="domainExpiry"
              value={formData.domainExpiry}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-600">Hosting Plan</label>
            <input
              type="text"
              name="hostingPlan"
              value={formData.hostingPlan}
              onChange={handleChange}
              placeholder="Basic, Professional, etc."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-600">Hosting Expiry Date</label>
            <input
              type="date"
              name="hostingExpiry"
              value={formData.hostingExpiry}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.primary }}
            >
              {editingDomain ? "Update" : "Add"} Domain
            </button>
            {editingDomain && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DomainForm;