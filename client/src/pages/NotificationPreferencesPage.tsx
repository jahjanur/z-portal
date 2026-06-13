import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import API from "../api";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { SkeletonRows } from "../components/ui/Skeleton";

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

/** Modern switch built on top of the original checkbox input (handlers untouched). */
function ToggleSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className="h-5 w-9 rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] transition-colors peer-checked:border-[var(--color-nav-active-bg)] peer-checked:bg-[var(--color-nav-active-bg)] peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus-ring)]"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--color-text-muted)] transition-transform peer-checked:translate-x-4 peer-checked:bg-[var(--color-nav-active-text)]"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

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
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <PageHeader
            title="Notification Preferences"
            subtitle="Choose which notifications you receive in-app and via email."
          />
          <SkeletonRows rows={5} />
        </div>
      </div>
    );
  }

  const categories = [...new Set(prefs.map((p) => EVENT_TYPE_LABELS[p.eventType]?.category).filter(Boolean))] as string[];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader
          title="Notification Preferences"
          subtitle="Choose which notifications you receive in-app and via email."
          actions={
            saving ? (
              <Button variant="ghost" size="sm" loading>
                Saving
              </Button>
            ) : undefined
          }
        />

        <div className="space-y-6 stagger-children">
          {categories.map((category) => {
            const categoryPrefs = prefs.filter((p) => EVENT_TYPE_LABELS[p.eventType]?.category === category);
            if (categoryPrefs.length === 0) return null;

            return (
              <section key={category} className="card-panel p-5 sm:p-6">
                <h3 className="section-title mb-4">{category}</h3>
                <div className="space-y-1">
                  {categoryPrefs.map((pref) => {
                    const meta = EVENT_TYPE_LABELS[pref.eventType];
                    return (
                      <div
                        key={pref.eventType}
                        className="row-hover flex items-center justify-between gap-4 rounded-xl px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[var(--color-text-primary)]">{meta?.label || pref.eventType}</p>
                          {pref.critical && (
                            <p className="mt-0.5 text-xs text-[var(--color-warning-text)]">
                              Required for admins — at least one channel must stay enabled
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <ToggleSwitch
                            label="In-app"
                            checked={pref.inAppEnabled}
                            onChange={(e) => handleToggle(pref.eventType, "inAppEnabled", e.target.checked)}
                            disabled={pref.critical && pref.inAppEnabled && !pref.emailEnabled}
                          />
                          <ToggleSwitch
                            label="Email"
                            checked={pref.emailEnabled}
                            onChange={(e) => handleToggle(pref.eventType, "emailEnabled", e.target.checked)}
                            disabled={pref.critical && pref.emailEnabled && !pref.inAppEnabled}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
