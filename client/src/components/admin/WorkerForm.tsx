import { useState } from "react";
import toast from "react-hot-toast";

interface WorkerFormProps {
  onSubmit: (data: { email: string; password: string; name: string }) => Promise<void>;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onSubmit }) => {
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
    <div className="mb-6 rounded-xl card-panel p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Add New Worker</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Full Name *</label>
            <input
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Email Address *</label>
            <input
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Password *</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              minLength={6}
              className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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