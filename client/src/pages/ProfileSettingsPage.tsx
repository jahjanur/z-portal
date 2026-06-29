import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import WorkerProfileEditor, { type WorkerProfileValue } from "../components/WorkerProfileEditor";
import { avatarGlyph } from "../constants/workerProfile";

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState<WorkerProfileValue>({ nickname: "", avatarEmoji: "", skills: [] });

  useEffect(() => {
    API.get("/auth/verify")
      .then(({ data }) => {
        const u = data.user;
        setName(u.name || "");
        setValue({
          nickname: u.nickname || "",
          avatarEmoji: u.avatarEmoji || "",
          skills: Array.isArray(u.skills) ? u.skills : [],
        });
      })
      .catch(() => toast.error("Couldn't load your profile"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await API.patch("/users/me/profile", {
        nickname: value.nickname.trim(),
        avatarEmoji: value.avatarEmoji,
        skills: value.skills,
      });
      // Keep the navbar/avatar in sync with what we just saved.
      if (data.nickname) localStorage.setItem("nickname", data.nickname);
      else localStorage.removeItem("nickname");
      if (data.avatarEmoji) localStorage.setItem("avatarEmoji", data.avatarEmoji);
      else localStorage.removeItem("avatarEmoji");
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner page size="lg" label="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-2xl">
          {avatarGlyph({ name, avatarEmoji: value.avatarEmoji })}
        </div>
        <div className="min-w-0">
          <h1 className="page-title">My profile</h1>
          <p className="page-subtitle truncate">{name}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 shadow-elev-sm">
        <WorkerProfileEditor value={value} onChange={setValue} />
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-5">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>
            Back
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
