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
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-nav-active-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-nav-active-text)] shadow-elev-sm"
            >
              {name}
              <button
                type="button"
                onClick={() => toggle(name)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[var(--color-nav-active-text)] opacity-70 transition-opacity hover:opacity-100"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="badge transition-colors hover:text-[var(--color-destructive-text)]"
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
                    aria-pressed={active}
                    className={`transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] ${
                      active
                        ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--color-nav-active-bg)] px-3 py-1 text-xs font-semibold leading-5 text-[var(--color-nav-active-text)] shadow-elev-sm"
                        : "badge hover:border-[var(--color-border-focus)] hover:text-[var(--color-text-primary)]"
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
