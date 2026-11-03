import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "../.."),
  test: {
    name: "api",
    include: ["tests/api/**/*.spec.ts"],
    environment: "node",
    testTimeout: 30_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
