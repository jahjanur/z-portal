// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "#0f0f12",
        card: "rgba(42, 42, 42, 0.8)",
        "border-subtle": "rgba(255, 255, 255, 0.1)",
        "border-medium": "rgba(255, 255, 255, 0.15)",
        accent: "#5B4FFF",
        "accent-dim": "rgba(91, 79, 255, 0.4)",
      },
      backgroundColor: {
        glass: "rgba(42, 42, 42, 0.6)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
        surface: {
          1: "#0f0f12",
          2: "rgba(255, 255, 255, 0.05)",
          3: "rgba(255, 255, 255, 0.08)",
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