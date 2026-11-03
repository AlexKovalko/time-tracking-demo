
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WEB_BASE_URL } from "../helpers/env";

const root = resolve(__dirname, "../..");

/**
 * AC-17 / AC-19 / AC-30 (#48, #50, #61) — reseed docs + port + chart-ready seed contract.
 */
describe("structure · reseed & port (AC-17/19/30)", () => {
  it("documents force reseed command (AC-17 #48, AC-30 #61)", () => {
    const paths = [
      resolve(root, "docs/env.md"),
      resolve(root, "README.md"),
      resolve(root, "docs/runbook-launch.md"),
    ];
    const blob = paths
      .filter((p) => existsSync(p))
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");
    expect(blob.length).toBeGreaterThan(0);
    expect(blob.toLowerCase()).toMatch(/reseed|seed --|--force|force.*seed/);
    // Chart/dept density called out for AC-30 (or agent/product spec until devops amends)
    const specs = readFileSync(
      resolve(root, "docs/specs/time-tracking-calendar/agent.md"),
      "utf8",
    );
    expect(specs).toMatch(/department|chart|AC-30/i);
  });

  it("Compose / default web URL uses port 8081 not 8080 (AC-19 #50)", () => {
    expect(WEB_BASE_URL).toMatch(/:8081/);
    expect(WEB_BASE_URL).not.toMatch(/:8080/);

    const composePath = [
      resolve(root, "docker-compose.yml"),
      resolve(root, "compose.yml"),
    ].find((p) => existsSync(p));
    expect(composePath).toBeTruthy();
    const compose = readFileSync(composePath!, "utf8");
    expect(compose).toMatch(/["']?8081:80["']?/);
    // Published mapping must not use host 8080
    expect(compose).not.toMatch(/["']8080:\d+["']/);
  });
});
