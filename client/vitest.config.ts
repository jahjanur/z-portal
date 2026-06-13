import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// Separate from vite.config.ts so the production build config stays untouched.
// Pure-logic tests run in a node environment (no jsdom needed).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
});
