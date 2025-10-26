// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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