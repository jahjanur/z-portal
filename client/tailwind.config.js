// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Panchang", "sans-serif"],
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
      },
      animation: {
        "gradient-shimmer": "gradient-shimmer 4s linear infinite",
        float: "float 4s ease-in-out infinite",
        "border-glow": "gradient-shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};