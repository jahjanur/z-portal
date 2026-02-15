import React, { useEffect, useState, useRef } from "react";
import { CONTROL_INPUT, CONTROL_LABEL, CONTROL_SELECT } from "../ui/controls";

interface User {
  id: number;
  name: string;
  company?: string;
}

interface DomainFormProps {
  onSubmit: (domainData: {
    clientId: string;
    domainName: string;
    notes?: string;
  }) => Promise<void>;
  onUpdate: (domainId: number, domainData: {
    domainName: string;
    notes?: string;
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
    notes?: string;
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
    notes: "",
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
        notes: editingDomain.notes || "",
      });
    } else {
      setFormData({
        clientId: "",
        domainName: "",
        notes: "",
      });
    }
  }, [editingDomain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        notes: formData.notes,
      });
      onCancelEdit();
    } else {
      if (!formData.clientId) {
        alert("Client is required.");
        return;
      }
      await onSubmit(formData);
      setFormData({ clientId: "", domainName: "", notes: "" });
    }
  };

  return (
    <div
      ref={formRef}
      className="mb-6 rounded-xl card-panel p-5 shadow-lg shadow-[var(--color-shadow)] backdrop-blur-md transition"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-theme-primary">
          {editingDomain ? "✏️ Edit Domain" : "Add New Domain"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:items-end">
          {!editingDomain && (
            <div className="w-full">
              <label className={CONTROL_LABEL}>Select Client *</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className={CONTROL_SELECT}
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

          <div className="w-full">
            <label className={CONTROL_LABEL}>Domain Name *</label>
            <input
              type="text"
              name="domainName"
              value={formData.domainName}
              onChange={handleChange}
              placeholder="example.com"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="w-full">
            <label className={CONTROL_LABEL}>Notes</label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes about this domain"
              className={CONTROL_INPUT}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="btn-primary inline-flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold"
            >
              {editingDomain ? "Update" : "Add"} Domain
            </button>
            {editingDomain && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="btn-secondary inline-flex h-11 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold"
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