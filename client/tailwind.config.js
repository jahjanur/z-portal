// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Panchang", "Inter", "sans-serif"],
      },
      boxShadow: {
        "elev-sm": "var(--shadow-sm)",
        "elev-md": "var(--shadow-md)",
        "elev-lg": "var(--shadow-lg)",
      },
      colors: {
        app: "var(--color-bg)",
        card: "var(--color-surface-2)",
        "border-subtle": "var(--color-border)",
        "border-medium": "var(--color-border-hover)",
        "theme-bg": "var(--color-bg)",
        "theme-surface-1": "var(--color-surface-1)",
        "theme-surface-2": "var(--color-surface-2)",
        "theme-surface-3": "var(--color-surface-3)",
        "theme-border": "var(--color-border)",
        "theme-text": "var(--color-text-primary)",
        "theme-muted": "var(--color-text-muted)",
        "theme-destructive": "var(--color-destructive-text)",
      },
      backgroundColor: {
        glass: "var(--color-glass)",
        "glass-border": "var(--color-glass-border)",
        surface: {
          1: "var(--color-surface-1)",
          2: "var(--color-surface-2)",
          3: "var(--color-surface-3)",
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        "vignette": "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      keyframes: {
        "gradient-shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        float: {
          "0%": { transform: "translateY(0)", opacity: "0.6" },
          "50%": { transform: "translateY(-15px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "0.6" },
        },
        "border-glow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "gradient-shimmer": "gradient-shimmer 4s linear infinite",
        float: "float 4s ease-in-out infinite",
        "border-glow": "gradient-shimmer 6s linear infinite",
        "fade-up": "fade-up 0.35s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
        "slide-up": "slide-up 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};