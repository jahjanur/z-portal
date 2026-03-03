import { useState } from "react";
import toast from "react-hot-toast";

interface WorkerFormProps {
  onSubmit: (data: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  allowEraSphereRole?: boolean;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onSubmit, allowEraSphereRole = false }) => {
  const [formData, setFormData] = useState({ email: "", password: "", name: "", role: "WORKER" as string });
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
      const result = await onSubmit({ ...formData, role: formData.role });
      setFormData({ email: "", password: "", name: "", role: "WORKER" });
      toast.success(formData.role === "ERASPHERE" ? "EraSphere partner created successfully!" : "Worker created successfully!");
      const inviteLink = result && typeof result === "object" && "inviteLink" in result && result.inviteLink;
      if (inviteLink && typeof inviteLink === "string") {
        try {
          await navigator.clipboard.writeText(inviteLink);
          toast.success("Invite link copied to clipboard (use it to complete profile)", { duration: 6000 });
        } catch {
          toast.success(`Invite link: ${inviteLink}`, { duration: 12000 });
        }
      }
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
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
        {allowEraSphereRole ? "Add Worker or EraSphere Partner" : "Add New Worker"}
      </h3>
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
          {allowEraSphereRole && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={isSubmitting}
                className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="WORKER">Worker</option>
                <option value="ERASPHERE">EraSphere Partner</option>
              </select>
            </div>
          )}
          <div className={`flex items-end ${allowEraSphereRole ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-1"}`}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : formData.role === "ERASPHERE" ? "Add EraSphere Partner" : "Add Worker"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default WorkerForm;