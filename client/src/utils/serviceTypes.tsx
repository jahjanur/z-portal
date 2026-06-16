import { AppWindow, Globe, Megaphone, Folder } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ServiceType = "WEB_APP" | "WEBSITE" | "SMM" | "OTHER";
export type FieldType =
  | "money"
  | "number"
  | "url"
  | "text"
  | "textarea"
  | "date"
  | "platforms"
  | "checklist"
  | "colors"
  | "links"
  | "credentials";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

export interface ServiceTypeDef {
  key: ServiceType;
  label: string;
  icon: LucideIcon;
  accent: string;
  blurb: string;
  fields: FieldDef[];
}

export const SMM_PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "X", "YouTube"];

export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    key: "WEB_APP",
    label: "Web App",
    icon: AppWindow,
    accent: "#7c6bff",
    blurb: "Product build — features, environments, releases",
    fields: [
      { key: "stagingUrl", label: "Staging URL", type: "url", placeholder: "https://staging.example.com" },
      { key: "prodUrl", label: "Production URL", type: "url", placeholder: "https://app.example.com" },
      { key: "repoUrl", label: "Repository", type: "url", placeholder: "https://github.com/…" },
      { key: "techStack", label: "Tech stack", type: "text", placeholder: "React, Node, Postgres" },
      { key: "brandColors", label: "Brand colors", type: "colors" },
      { key: "assets", label: "Design & brand assets", type: "links" },
      { key: "credentials", label: "Access & credentials", type: "credentials" },
      { key: "envNotes", label: "Environment / config notes", type: "textarea", placeholder: "Env vars, deploy steps, gotchas…" },
      { key: "features", label: "Features / modules", type: "checklist" },
    ],
  },
  {
    key: "WEBSITE",
    label: "Website",
    icon: Globe,
    accent: "#34d399",
    blurb: "Marketing site — pages, sections, launch",
    fields: [
      { key: "liveUrl", label: "Live URL", type: "url", placeholder: "https://example.com" },
      { key: "brandColors", label: "Brand colors", type: "colors" },
      { key: "assets", label: "Design & brand assets", type: "links" },
      { key: "pagesPlanned", label: "Pages planned", type: "number" },
      { key: "pagesDone", label: "Pages done", type: "number" },
      { key: "launchDate", label: "Target launch", type: "date" },
      { key: "credentials", label: "Access & logins", type: "credentials" },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Anything the team should know…" },
      { key: "features", label: "Sections / features", type: "checklist" },
    ],
  },
  {
    key: "SMM",
    label: "Social Media",
    icon: Megaphone,
    accent: "#fbbf24",
    blurb: "Content & design, ad campaigns, deliverables",
    fields: [
      { key: "platforms", label: "Platforms", type: "platforms" },
      { key: "brandColors", label: "Brand colors", type: "colors" },
      { key: "assets", label: "Brand assets & references", type: "links" },
      { key: "brief", label: "Design brief / notes", type: "textarea", placeholder: "Tone, style, do's & don'ts, references…" },
      { key: "monthlyBudget", label: "Monthly retainer", type: "money" },
      { key: "adBudget", label: "Ad budget (this period)", type: "money" },
      { key: "adSpent", label: "Ad spent (this period)", type: "money" },
      { key: "postsPlanned", label: "Posts / designs planned", type: "number" },
      { key: "postsDelivered", label: "Posts / designs delivered", type: "number" },
    ],
  },
  {
    key: "OTHER",
    label: "Other",
    icon: Folder,
    accent: "rgba(255,255,255,0.55)",
    blurb: "General project",
    fields: [
      { key: "assets", label: "Files & links", type: "links" },
      { key: "credentials", label: "Access & logins", type: "credentials" },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Anything the team should know…" },
    ],
  },
];

export function getServiceDef(key?: string): ServiceTypeDef {
  return SERVICE_TYPES.find((s) => s.key === key) ?? SERVICE_TYPES[3];
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface ServiceStat {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}
export interface ServiceSummary {
  progress: number | null; // 0-100 or null
  progressLabel?: string;
  stats: ServiceStat[];
}

interface ChecklistItem { label: string; done?: boolean }

function checklistProgress(items: unknown): { done: number; total: number } {
  const arr = Array.isArray(items) ? (items as ChecklistItem[]) : [];
  return { done: arr.filter((i) => i?.done).length, total: arr.length };
}

const money = (v: unknown) => `$${num(v).toLocaleString()}`;

/** Compute a compact, type-specific summary for a project's metadata. */
export function summarizeService(serviceType?: string, metadata?: Record<string, unknown> | null): ServiceSummary {
  const m = (metadata || {}) as Record<string, unknown>;
  switch (serviceType) {
    case "SMM": {
      const planned = num(m.postsPlanned);
      const delivered = num(m.postsDelivered);
      const progress = planned > 0 ? Math.min(100, Math.round((delivered / planned) * 100)) : null;
      const stats: ServiceStat[] = [];
      const adBudget = num(m.adBudget);
      const adSpent = num(m.adSpent);
      if (adBudget || adSpent) {
        const over = adSpent > adBudget && adBudget > 0;
        stats.push({ label: "Ad spend", value: `${money(adSpent)} / ${money(adBudget)}`, tone: over ? "danger" : "default" });
      }
      if (planned) stats.push({ label: "Content", value: `${delivered}/${planned}` });
      if (Array.isArray(m.platforms) && m.platforms.length) stats.push({ label: "Platforms", value: String((m.platforms as unknown[]).length) });
      if (num(m.monthlyBudget)) stats.push({ label: "Retainer", value: `${money(m.monthlyBudget)}/mo` });
      return { progress, progressLabel: planned ? `${delivered}/${planned} delivered` : undefined, stats };
    }
    case "WEBSITE": {
      const planned = num(m.pagesPlanned);
      const done = num(m.pagesDone);
      const fc = checklistProgress(m.features);
      const progress = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : fc.total ? Math.round((fc.done / fc.total) * 100) : null;
      const stats: ServiceStat[] = [];
      if (planned) stats.push({ label: "Pages", value: `${done}/${planned}` });
      if (fc.total) stats.push({ label: "Sections", value: `${fc.done}/${fc.total}` });
      if (m.liveUrl) stats.push({ label: "Live", value: "✓", tone: "success" });
      return { progress, progressLabel: planned ? `${done}/${planned} pages` : undefined, stats };
    }
    case "WEB_APP": {
      const fc = checklistProgress(m.features);
      const progress = fc.total ? Math.round((fc.done / fc.total) * 100) : null;
      const stats: ServiceStat[] = [];
      if (fc.total) stats.push({ label: "Features", value: `${fc.done}/${fc.total}` });
      if (m.prodUrl) stats.push({ label: "Live", value: "✓", tone: "success" });
      else if (m.stagingUrl) stats.push({ label: "Staging", value: "✓" });
      return { progress, progressLabel: fc.total ? `${fc.done}/${fc.total} features` : undefined, stats };
    }
    default:
      return { progress: null, stats: [] };
  }
}
