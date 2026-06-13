import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    // These are integration tests sharing one Postgres database. Running test
    // files in parallel races on shared rows (e.g. one file snapshots all
    // invoices while another creates/deletes one). Run files sequentially so
    // the suite is deterministic.
    fileParallelism: false,
  },
});
