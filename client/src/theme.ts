/**
 * Z-Portal design system: grayscale dark theme, minimal neutral accents.
 */
export const theme = {
  background: {
    app: "#0b0f14",
    card: "rgba(255, 255, 255, 0.05)",
    cardBorder: "rgba(255, 255, 255, 0.1)",
    input: "rgba(255, 255, 255, 0.08)",
    surface1: "#0b0f14",
    surface2: "rgba(255, 255, 255, 0.05)",
    surface3: "rgba(255, 255, 255, 0.08)",
  },
  text: {
    primary: "rgba(255, 255, 255, 0.9)",
    secondary: "rgba(255, 255, 255, 0.65)",
    muted: "rgba(255, 255, 255, 0.45)",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.14)",
  },
} as const;
