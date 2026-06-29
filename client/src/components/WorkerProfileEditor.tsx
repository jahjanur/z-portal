import {
  AVATAR_EMOJIS,
  SKILLS,
  MAX_SKILLS,
  MAX_NICKNAME_LEN,
} from "../constants/workerProfile";

export interface WorkerProfileValue {
  nickname: string;
  avatarEmoji: string;
  skills: string[];
}

interface Props {
  value: WorkerProfileValue;
  onChange: (next: WorkerProfileValue) => void;
}

/** Nickname input + emoji grid + skill multi-select. Shared by onboarding & settings. */
export default function WorkerProfileEditor({ value, onChange }: Props) {
  const toggleSkill = (label: string) => {
    const has = value.skills.includes(label);
    if (has) {
      onChange({ ...value, skills: value.skills.filter((s) => s !== label) });
    } else if (value.skills.length < MAX_SKILLS) {
      onChange({ ...value, skills: [...value.skills, label] });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Nickname */}
      <div>
        <label htmlFor="wp-nickname" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
          Nickname
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">
            {value.avatarEmoji || "🙂"}
          </span>
          <input
            id="wp-nickname"
            type="text"
            value={value.nickname}
            maxLength={MAX_NICKNAME_LEN}
            onChange={(e) => onChange({ ...value, nickname: e.target.value })}
            placeholder="e.g. Rocket"
            className="input-dark w-full py-3 pl-11 pr-4"
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          This is how teammates will see you across the workspace.
        </p>
      </div>

      {/* Emoji avatar */}
      <div>
        <span className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Pick an avatar</span>
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {AVATAR_EMOJIS.map((emoji) => {
            const active = value.avatarEmoji === emoji;
            return (
              <button
                type="button"
                key={emoji}
                onClick={() => onChange({ ...value, avatarEmoji: active ? "" : emoji })}
                aria-pressed={active}
                aria-label={`Avatar ${emoji}`}
                className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition ${
                  active
                    ? "border-[var(--color-focus-ring)] bg-[var(--color-nav-active-bg)] shadow-elev-sm scale-105"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Your skills</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {value.skills.length}/{MAX_SKILLS}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(({ label, className }) => {
            const active = value.skills.includes(label);
            const atMax = !active && value.skills.length >= MAX_SKILLS;
            return (
              <button
                type="button"
                key={label}
                onClick={() => toggleSkill(label)}
                disabled={atMax}
                aria-pressed={active}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition ${
                  active
                    ? `${className} scale-105`
                    : `bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] ring-[var(--color-border)] hover:bg-[var(--color-surface-3)] ${
                        atMax ? "cursor-not-allowed opacity-40" : ""
                      }`
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
