/**
 * Z-Portal design system: dark theme, glassmorphism, premium grid style.
 */
export const theme = {
  background: {
    app: "#0f0f12",
    card: "rgba(42, 42, 42, 0.8)",
    cardBorder: "rgba(255, 255, 255, 0.1)",
    input: "rgba(255, 255, 255, 0.08)",
    surface1: "#0f0f12",
    surface2: "rgba(255, 255, 255, 0.05)",
    surface3: "rgba(255, 255, 255, 0.08)",
  },
  text: {
    primary: "rgba(255, 255, 255, 0.9)",
    secondary: "rgba(255, 255, 255, 0.7)",
    muted: "rgba(255, 255, 255, 0.5)",
  },
  accent: {
    primary: "#5B4FFF",
    primaryDim: "rgba(91, 79, 255, 0.4)",
    green: "#22c55e",
    greenDim: "rgba(34, 197, 94, 0.5)",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.15)",
  },
} as const;
