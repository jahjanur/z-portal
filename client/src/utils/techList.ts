export interface Tech {
  name: string;
  /** Simple Icons slug — used to fetch SVG from cdn.simpleicons.org/{slug}/000000 */
  slug: string;
  category: string;
}

export const TECH_CATEGORIES = [
  "Frontend",
  "Backend & API",
  "Mobile",
  "Design & Prototyping",
  "DevOps & Cloud",
  "Tools & Workflow",
] as const;

export const TECH_LIST: Tech[] = [
  // ── Frontend ─────────────────────────────────────────────────────────
  { name: "React",        slug: "react",         category: "Frontend" },
  { name: "Next.js",      slug: "nextdotjs",     category: "Frontend" },
  { name: "Astro",        slug: "astro",         category: "Frontend" },
  { name: "TypeScript",   slug: "typescript",    category: "Frontend" },
  { name: "Vue.js",       slug: "vuedotjs",      category: "Frontend" },
  { name: "Tailwind CSS", slug: "tailwindcss",   category: "Frontend" },
  { name: "Three.js",     slug: "threedotjs",    category: "Frontend" },

  // ── Backend & API ─────────────────────────────────────────────────────
  { name: "Node.js",      slug: "nodedotjs",     category: "Backend & API" },
  { name: "PostgreSQL",   slug: "postgresql",    category: "Backend & API" },
  { name: "MongoDB",      slug: "mongodb",       category: "Backend & API" },
  { name: "GraphQL",      slug: "graphql",       category: "Backend & API" },
  { name: "REST APIs",    slug: "openapiinitiative", category: "Backend & API" },
  { name: "Redis",        slug: "redis",         category: "Backend & API" },

  // ── Mobile ────────────────────────────────────────────────────────────
  { name: "React Native", slug: "react",         category: "Mobile" },
  { name: "Flutter",      slug: "flutter",       category: "Mobile" },
  { name: "Swift",        slug: "swift",         category: "Mobile" },
  { name: "Kotlin",       slug: "kotlin",        category: "Mobile" },

  // ── Design & Prototyping ──────────────────────────────────────────────
  { name: "Figma",          slug: "figma",              category: "Design & Prototyping" },
  { name: "After Effects",  slug: "adobeaftereffects",  category: "Design & Prototyping" },
  { name: "Photoshop",      slug: "adobephotoshop",     category: "Design & Prototyping" },
  { name: "Illustrator",    slug: "adobeillustrator",   category: "Design & Prototyping" },
  { name: "Premiere Pro",   slug: "adobepremierepro",   category: "Design & Prototyping" },
  { name: "DaVinci Resolve",slug: "davinciresolve",     category: "Design & Prototyping" },
  { name: "Framer",         slug: "framer",             category: "Design & Prototyping" },
  { name: "Blender",        slug: "blender",            category: "Design & Prototyping" },

  // ── DevOps & Cloud ────────────────────────────────────────────────────
  { name: "AWS",            slug: "amazonaws",        category: "DevOps & Cloud" },
  { name: "Vercel",         slug: "vercel",           category: "DevOps & Cloud" },
  { name: "Docker",         slug: "docker",           category: "DevOps & Cloud" },
  { name: "GitHub Actions", slug: "githubactions",    category: "DevOps & Cloud" },

  // ── Tools & Workflow ──────────────────────────────────────────────────
  { name: "Vite",           slug: "vite",     category: "Tools & Workflow" },
  { name: "ESLint",         slug: "eslint",   category: "Tools & Workflow" },
  { name: "Prettier",       slug: "prettier", category: "Tools & Workflow" },
  { name: "Jira",           slug: "jira",     category: "Tools & Workflow" },
  { name: "Linear",         slug: "linear",   category: "Tools & Workflow" },
];

/** Lookup a tech by name (case-insensitive). */
export function findTech(name: string): Tech | undefined {
  return TECH_LIST.find((t) => t.name.toLowerCase() === name.toLowerCase());
}
