import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // prepare-release tests mutate repo-root files; avoid cross-file races.
    fileParallelism: false,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
      "scripts/**/*.test.mjs",
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/modules/**/*.ts",
        "scripts/**/*.{mjs,js}",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.schema.ts",
        "**/*.types.ts",
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
