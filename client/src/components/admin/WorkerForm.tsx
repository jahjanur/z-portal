import { useState } from "react";
import toast from "react-hot-toast";

interface WorkerFormProps {
  onSubmit: (data: { email: string; password: string; name: string }) => Promise<void>;
  colors: { primary: string };
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onSubmit, colors }) => {
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter an email");
      return;
    }
    if (!formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!formData.password.trim()) {
      toast.error("Please enter a password");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ email: "", password: "", name: "" });
      toast.success("Worker created successfully!");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || "Failed to create worker";
      toast.error(errorMessage);
      console.error("Error creating worker:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="p-5 mb-6 border border-gray-200 bg-gray-50 rounded-xl">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Add New Worker</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Full Name *</label>
            <input
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Email Address *</label>
            <input
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Password *</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              minLength={6}
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary }}
            >
              {isSubmitting ? "Adding..." : "Add Worker"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default WorkerForm;