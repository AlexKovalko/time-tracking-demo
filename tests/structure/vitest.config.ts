import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "../.."),
  test: {
    name: "structure",
    include: ["tests/structure/**/*.spec.ts"],
    environment: "node",
    testTimeout: 10_000,
  },
});
