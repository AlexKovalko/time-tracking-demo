import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "../.."),
  test: {
    name: "unit",
    include: ["tests/unit/**/*.spec.ts"],
    environment: "node",
    testTimeout: 10_000,
  },
});
