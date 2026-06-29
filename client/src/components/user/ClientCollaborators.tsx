import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UsersRound, Plus, Trash2, Mail, Copy, Check } from "lucide-react";
import API from "../../api";
import Button from "../ui/Button";

interface Member {
  id: number;
  name: string;
  email: string;
  profileStatus?: string | null;
  companyOwnerId?: number | null;
  createdAt: string;
}

/** Client-facing: a company member invites/lists/removes their own collaborators. */
export default function ClientCollaborators() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    API.get<Member[]>("/users/my-team-members")
      .then((r) => setMembers(r.data))
      .catch(() => toast.error("Couldn't load your team"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const invite = async () => {
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      const { data } = await API.post("/invites/my-team-member", { name: name.trim(), email: email.trim() });
      toast.success(`Invite sent to ${email.trim()}`);
      setLastLink(data.inviteLink ?? null);
      setName(""); setEmail(""); setAdding(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't send invite");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: Member) => {
    if (!window.confirm(`Remove ${m.name} from your team? They'll lose access.`)) return;
    try {
      await API.delete(`/users/my-team-members/${m.id}`);
      toast.success("Collaborator removed");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Couldn't remove collaborator");
    }
  };

  const copyLink = async () => {
    if (!lastLink) return;
    try { await navigator.clipboard.writeText(lastLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <div className="space-y-6">
      <div className="card-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Your team</h2>
              <p className="mt-0.5 max-w-xl text-sm text-[var(--color-text-muted)]">
                Invite co-founders or teammates. Each gets their own login with full access to your tasks, files, invoices, domains and feedback.
              </p>
            </div>
          </div>
          {!adding && (
            <Button variant="primary" size="sm" className="shrink-0" onClick={() => { setAdding(true); setLastLink(null); }}>
              <Plus className="h-4 w-4" /> Add collaborator
            </Button>
          )}
        </div>

        {adding && (
          <div className="mt-4 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-dark w-full px-3 py-2.5 text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" type="email" className="input-dark w-full px-3 py-2.5 text-sm" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setName(""); setEmail(""); }} disabled={busy}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={invite} loading={busy} disabled={!name.trim() || !email.trim()}>
                <Mail className="h-4 w-4" /> Send invite
              </Button>
            </div>
          </div>
        )}

        {lastLink && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">{lastLink}</span>
            <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success-text)]" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : members.length === 0 ? (
        <div className="card-panel p-8 text-center">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">No collaborators yet</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Add a teammate above so more than one person can manage your projects.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="card-panel row-hover flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] text-sm font-bold text-[var(--color-text-primary)]">
                {m.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--color-text-primary)]">
                  {m.name}
                  {!m.companyOwnerId && <span className="ml-2 rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Owner</span>}
                </p>
                <p className="truncate text-sm text-[var(--color-text-muted)]">{m.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.profileStatus === "COMPLETE" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"}`}>
                {m.profileStatus === "COMPLETE" ? "Active" : "Invited"}
              </span>
              {m.companyOwnerId && (
                <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="shrink-0 text-[var(--color-text-muted)] transition hover:text-[var(--color-destructive-text)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
