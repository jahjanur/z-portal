import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import API from "../api";

interface Preference {
  eventType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  critical: boolean;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; category: string }> = {
  WORKER_CREATED: { label: "Worker account created", category: "Users" },
  CLIENT_CREATED: { label: "Client account created", category: "Users" },
  ERASPHERE_CREATED: { label: "EraSphere partner created", category: "Users" },
  PROFILE_COMPLETED: { label: "Profile completed", category: "Users" },
  TASK_ASSIGNED: { label: "Task assigned to you", category: "Tasks" },
  TASK_CREATED: { label: "New task created", category: "Tasks" },
  TASK_STATUS_CHANGED: { label: "Task status changed", category: "Tasks" },
  TASK_COMPLETED: { label: "Task completed", category: "Tasks" },
  TASK_PENDING_APPROVAL: { label: "Task pending approval", category: "Tasks" },
  TASK_COMMENT_ADDED: { label: "Comment added to task", category: "Tasks" },
  TASK_FILE_UPLOADED: { label: "File uploaded to task", category: "Tasks" },
  TASK_DEADLINE_APPROACHING: { label: "Task deadline approaching", category: "Tasks" },
  TASK_OVERDUE: { label: "Task overdue", category: "Tasks" },
  INVOICE_CREATED: { label: "New invoice created", category: "Invoices" },
  INVOICE_PAID: { label: "Invoice paid", category: "Invoices" },
  INVOICE_OVERDUE: { label: "Invoice overdue", category: "Invoices" },
  INVOICE_DUE_SOON: { label: "Invoice due soon", category: "Invoices" },
  DOMAIN_CREATED: { label: "New domain added", category: "Domains" },
  DOMAIN_ACTIVATED: { label: "Domain activated", category: "Domains" },
  DOMAIN_RENEWED: { label: "Domain renewed", category: "Domains" },
  DOMAIN_EXPIRING_30: { label: "Domain expires in 30 days", category: "Domains" },
  DOMAIN_EXPIRING_14: { label: "Domain expires in 14 days", category: "Domains" },
  DOMAIN_EXPIRING_7: { label: "Domain expires in 7 days", category: "Domains" },
  DOMAIN_EXPIRED: { label: "Domain expired", category: "Domains" },
  TIMESHEET_SUBMITTED: { label: "Timesheet submitted", category: "Timesheets" },
  ERASPHERE_NEW_CLIENT: { label: "EraSphere partner added client", category: "EraSphere" },
  ERASPHERE_NEW_TASK: { label: "EraSphere partner added task", category: "EraSphere" },
  ERASPHERE_REFERRED_ACCEPTED: { label: "Referred client accepted invite", category: "EraSphere" },
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const { data } = await API.get<Preference[]>("/notifications/preferences");
      setPrefs(data);
    } catch {
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleToggle = async (eventType: string, field: "inAppEnabled" | "emailEnabled", value: boolean) => {
    const pref = prefs.find((p) => p.eventType === eventType);
    if (!pref) return;

    if (pref.critical && field === "inAppEnabled" && !value && !pref.emailEnabled) return;
    if (pref.critical && field === "emailEnabled" && !value && !pref.inAppEnabled) return;

    setPrefs((prev) =>
      prev.map((p) => (p.eventType === eventType ? { ...p, [field]: value } : p))
    );

    setSaving(true);
    try {
      await API.patch("/notifications/preferences", [{ eventType, [field]: value }]);
    } catch {
      setPrefs((prev) =>
        prev.map((p) => (p.eventType === eventType ? { ...p, [field]: !value } : p))
      );
      toast.error("Failed to save preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">Notification Preferences</h1>
        <div className="rounded-2xl card-panel p-8 text-center text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  const categories = [...new Set(prefs.map((p) => EVENT_TYPE_LABELS[p.eventType]?.category).filter(Boolean))] as string[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">Notification Preferences</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Choose which notifications you receive in-app and via email.
        {saving && <span className="ml-2 text-xs text-amber-400">Saving...</span>}
      </p>

      <div className="space-y-6">
        {categories.map((category) => {
          const categoryPrefs = prefs.filter((p) => EVENT_TYPE_LABELS[p.eventType]?.category === category);
          if (categoryPrefs.length === 0) return null;

          return (
            <div key={category} className="rounded-2xl card-panel p-5 shadow-xl">
              <h3 className="mb-4 text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">{category}</h3>
              <div className="space-y-1">
                {categoryPrefs.map((pref) => {
                  const meta = EVENT_TYPE_LABELS[pref.eventType];
                  return (
                    <div key={pref.eventType} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 hover:bg-[var(--color-surface-3)] transition">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--color-text-primary)]">{meta?.label || pref.eventType}</p>
                        {pref.critical && (
                          <p className="text-xs text-amber-400 mt-0.5">Required for admins — at least one channel must stay enabled</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <span className="text-xs text-[var(--color-text-muted)]">In-app</span>
                          <input
                            type="checkbox"
                            checked={pref.inAppEnabled}
                            onChange={(e) => handleToggle(pref.eventType, "inAppEnabled", e.target.checked)}
                            disabled={pref.critical && pref.inAppEnabled && !pref.emailEnabled}
                            className="h-4 w-4 rounded accent-[#5B4FFF]"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <span className="text-xs text-[var(--color-text-muted)]">Email</span>
                          <input
                            type="checkbox"
                            checked={pref.emailEnabled}
                            onChange={(e) => handleToggle(pref.eventType, "emailEnabled", e.target.checked)}
                            disabled={pref.critical && pref.emailEnabled && !pref.inAppEnabled}
                            className="h-4 w-4 rounded accent-[#5B4FFF]"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
