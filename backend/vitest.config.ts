import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Backend roda em Node; sem DOM.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
