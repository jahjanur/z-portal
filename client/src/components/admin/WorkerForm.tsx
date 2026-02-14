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
    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-white/90">Add New Worker</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/80">Full Name *</label>
            <input
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white/95 placeholder:text-white/35 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/80">Email Address *</label>
            <input
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white/95 placeholder:text-white/35 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/80">Password *</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              required
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white/95 placeholder:text-white/35 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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