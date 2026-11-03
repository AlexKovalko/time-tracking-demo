import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

/**
 * AC-12, AC-13, AC-14 — static / structural checks (no production feature code).
 * Expected RED until eng + tech-writer deliver apps and README.
 */
describe("structure · craft / docs / harness (AC-12, AC-13, AC-14)", () => {
  it("has separate Nest API and React web apps (AC-14)", () => {
    expect(existsSync(resolve(root, "apps/api/package.json"))).toBe(true);
    expect(existsSync(resolve(root, "apps/web/package.json"))).toBe(true);

    const apiPkg = JSON.parse(
      readFileSync(resolve(root, "apps/api/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const webPkg = JSON.parse(
      readFileSync(resolve(root, "apps/web/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(
      Object.keys(apiPkg.dependencies ?? {}).some((k) =>
        k.startsWith("@nestjs/"),
      ),
    ).toBe(true);

    const webDeps = webPkg.dependencies ?? {};
    expect(webDeps.react).toBeTruthy();
    expect(
      Object.keys(webDeps).some(
        (k) => k === "@tanstack/react-query" || k.includes("react-query"),
      ),
    ).toBe(true);
  });

  it("has Docker Compose with SQLite volume and nginx (AC-11, AC-14)", () => {
    const composePath = [
      resolve(root, "docker-compose.yml"),
      resolve(root, "compose.yml"),
      resolve(root, "docker-compose.yaml"),
    ].find((p) => existsSync(p));
    expect(composePath).toBeTruthy();
    const compose = readFileSync(composePath!, "utf8").toLowerCase();
    expect(compose).toMatch(/nginx/);
    expect(compose).toMatch(/volume/);
  });

  it("root README documents launch + AI workflow (AC-12)", () => {
    const readmePath = resolve(root, "README.md");
    expect(existsSync(readmePath)).toBe(true);
    const readme = readFileSync(readmePath, "utf8");
    expect(readme.length).toBeGreaterThan(200);
    expect(readme.toLowerCase()).toMatch(/docker\s*compose|docker-compose/);
    // AI workflow substance
    expect(readme).toMatch(/ИИ|AI|prompt|промпт/i);
    expect(readme).toMatch(/вручную|manual|исправ/i);
  });

  it("QA harness includes Playwright E2E for key journeys (AC-13)", () => {
    expect(existsSync(resolve(root, "tests/e2e/playwright.config.ts"))).toBe(
      true,
    );
    expect(
      existsSync(resolve(root, "tests/e2e/specs/happy-path.spec.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(root, "tests/e2e/specs/reject-second-start.spec.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(root, "tests/e2e/specs/empty-report.spec.ts")),
    ).toBe(true);
  });
});
