import React, { useState, useMemo } from "react";
import { TECH_LIST, TECH_CATEGORIES } from "../utils/techList";

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CONTROL =
  "h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-placeholder)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]";

export const TechStackSelector: React.FC<Props> = ({ selected, onChange }) => {
  const [search, setSearch] = useState("");

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((t) => t !== name)
        : [...selected, name]
    );
  };

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase();
    return TECH_CATEGORIES.map((cat) => ({
      cat,
      techs: TECH_LIST.filter(
        (t) => t.category === cat && t.name.toLowerCase().includes(q)
      ),
    })).filter((c) => c.techs.length > 0);
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search technologies…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={CONTROL}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-hover)] bg-[var(--color-surface-3)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]"
            >
              {name}
              <button
                type="button"
                onClick={() => toggle(name)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)]"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-destructive-text)] transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Category groups */}
      <div className="space-y-5">
        {filteredCategories.map(({ cat, techs }) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              {cat}
            </p>
            <div className="flex flex-wrap gap-2">
              {techs.map((tech) => {
                const active = selected.includes(tech.name);
                return (
                  <button
                    key={tech.name}
                    type="button"
                    onClick={() => toggle(tech.name)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] ${
                      active
                        ? "border-[var(--color-btn-primary-border)] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]"
                    }`}
                  >
                    {tech.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No technologies match "{search}"
          </p>
        )}
      </div>
    </div>
  );
};
