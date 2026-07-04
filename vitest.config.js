import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      exclude: [
        "node_modules/**",
        "prisma/**",
        "prisma.config.js",
        "eslint.config.js",
        "index.js",
        "tests/**",
        "coverage/**",
        "storage/**",
        "uploads/**",
      ],
    },
  },
});
