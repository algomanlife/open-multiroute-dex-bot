import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/config.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 }
    }
  }
});
