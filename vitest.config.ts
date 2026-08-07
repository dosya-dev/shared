import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "./coverage",
      // Without this, vitest's exclude list only filters the untested-file
      // glob; raw V8 process coverage passes straight into the report
      // unfiltered.
      excludeAfterRemap: true,
      // Positive filter: only first-party source under src/ counts.
      include: ["src/**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/*.test.ts",
        "**/*.unit.test.ts",
        "**/*.int.test.ts",
        "**/test-stubs/**",
        "**/dist/**",
        "**/node_modules/**",
        "**/*.config.ts",
      ],
    },
  },
});
