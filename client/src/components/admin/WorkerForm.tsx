import { useState } from "react";
import toast from "react-hot-toast";
import API from "../../api";

interface WorkerFormProps {
  onInviteSent?: () => void;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onInviteSent }) => {
  const [formData, setFormData] = useState({ email: "", name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await API.post("/invites", {
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: "WORKER",
      });
      setFormData({ email: "", name: "" });
      toast.success("Invite sent successfully!");
      if (data.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          toast.success("Invite link copied to clipboard", { duration: 5000 });
        } catch {
          // clipboard not available
        }
      }
      onInviteSent?.();
    } catch (error: any) {
      const data = error?.response?.data;
      const message = data?.hint
        ? `${data.error} ${data.hint} Or use a different email to test.`
        : data?.error || "Failed to send invite";
      toast.error(message, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl card-panel p-5">
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Invite Worker</h3>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        Send an invite email so the worker can set their own password and join the team.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Full Name *</label>
            <input
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              disabled={isSubmitting}
              required
              className="input-dark h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-11 w-full rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default WorkerForm;
