import { useState } from "react";

interface ClientFormProps {
  onSubmit: (data: {
    name: string;
    company: string;
    email: string;
    password: string;
    colorHex: string;
    postalAddress: string;
    domainName?: string;
    domainExpiry?: string;
    hostingPlan?: string;
    hostingExpiry?: string;
    sslExpiry?: string;
  }) => void;
  colors: { primary: string };
}

const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, colors }) => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    colorHex: "#5B4FFF",
    postalAddress: "",
    domainName: "",
    domainExpiry: "",
    hostingPlan: "",
    hostingExpiry: "",
    sslExpiry: "",
  });

  const [showHostingFields, setShowHostingFields] = useState(false);

  const handleSubmit = () => {
    if (!formData.name || !formData.company || !formData.email || !formData.password || !formData.postalAddress) {
      alert("Please fill in all required fields");
      return;
    }
    onSubmit(formData);
    setFormData({
      name: "",
      company: "",
      email: "",
      password: "",
      colorHex: "#5B4FFF",
      postalAddress: "",
      domainName: "",
      domainExpiry: "",
      hostingPlan: "",
      hostingExpiry: "",
      sslExpiry: "",
    });
    setShowHostingFields(false);
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

  return (
<div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Add New Client</h3>
          <p className="text-sm text-gray-600">Create a new client account and send invitation</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Email invite will be sent
        </div>
      </div>
      
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Contact Person <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="Acme Corporation"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="john@example.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
              required
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            Postal Address <span className="text-red-500">*</span>
          </label>
          <input
            placeholder="P.O. Box 123, City, Postal Code"
            value={formData.postalAddress}
            onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
            required
          />
        </div>

        {/* Toggle Hosting Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowHostingFields(!showHostingFields)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-2 rounded-lg hover:shadow-sm"
            style={{ 
              color: colors.primary, 
              borderColor: colors.primary,
              backgroundColor: showHostingFields ? `${colors.primary}15` : 'white'
            }}
          >
            {showHostingFields ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Hide Domain & Hosting
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Domain & Hosting
              </>
            )}
          </button>
        </div>
      </div>

      {/* Domain & Hosting Fields (Optional) */}
      {showHostingFields && (
        <div className="p-5 mt-4 border-2 border-dashed rounded-xl" style={{ borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}08` }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900">Domain & Hosting Information</h4>
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
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Domain Name
                </label>
                <input
                  placeholder="example.com"
                  value={formData.domainName}
                  onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Domain Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.domainExpiry}
                  onChange={(e) => setFormData({ ...formData, domainExpiry: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Hosting Plan
                </label>
                <input
                  placeholder="Basic / Premium / Enterprise"
                  value={formData.hostingPlan}
                  onChange={(e) => setFormData({ ...formData, hostingPlan: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Hosting Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.hostingExpiry}
                  onChange={(e) => setFormData({ ...formData, hostingExpiry: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": colors.primary } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-6 mt-6 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          className="w-full px-6 py-4 text-sm font-semibold text-white transition-all rounded-lg hover:opacity-90 hover:shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Client & Send Invite
          </span>
        </button>
        <p className="mt-3 text-xs text-center text-gray-500">
          <span className="text-red-500">*</span> Required fields • Client will receive an email to complete their profile
        </p>
      </div>
    </div>
  );
};

export default ClientForm;