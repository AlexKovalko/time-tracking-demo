import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * chart-axis-labels · #103 — CompactBarChart must draw visible axis ticks.
 * AC-1 (#104) day X · AC-2 (#105) week X · AC-3 (#106) Y duration scale
 * RED until frontend-dev renders tick text (not only tooltip / sr-only).
 */
const root = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(root, rel);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

describe("structure · chart-axis-labels CompactBarChart (AC-1…3 · #104–#106)", () => {
  it("draws visible X-axis tick labels (not baseline-only) (AC-1, AC-2)", () => {
    const src = read("apps/web/src/components/CompactBarChart.tsx");
    // Visible tick markers — baseline alone is not enough
    expect(src).toMatch(
      /data-axis-tick=["']x["']|data-chart-axis-tick=["']x["']|data-axis-label=["']x["']/,
    );
    // Must render <text> for ticks — sr-only list does not count as axis
    expect(src).toMatch(/<text[\s\S]{0,200}data-axis-tick=["']x["']|data-axis-tick=["']x["'][\s\S]{0,200}<text|data-chart-axis-tick=["']x["']/);
  });

  it("day mode axis uses DD.MM helper, not DD.MM.YYYY for ticks (AC-1)", () => {
    const src = read("apps/web/src/components/CompactBarChart.tsx");
    expect(src).toMatch(/formatDayAxisTick/);
  });

  it("week mode axis uses short ISO week tick helper (AC-2)", () => {
    const src = read("apps/web/src/components/CompactBarChart.tsx");
    expect(src).toMatch(/formatWeekAxisTick/);
  });

  it("draws visible Y-axis scale ticks for hours/duration (AC-3)", () => {
    const src = read("apps/web/src/components/CompactBarChart.tsx");
    expect(src).toMatch(
      /data-axis=["']y["']|data-chart-axis=["']y["']|data-axis-tick=["']y["']|data-chart-axis-tick=["']y["']/,
    );
    expect(src).toMatch(
      /data-axis-tick=["']y["']|data-chart-axis-tick=["']y["']|data-axis-label=["']y["']/,
    );
    // Y tick labeling via duration helpers (formatDuration alone on tooltip is not enough)
    expect(src).toMatch(
      /formatDurationAxisTick|durationAxisTicks/,
    );
  });

  it("format.ts exports axis tick helpers used by the chart (AC-1…3)", () => {
    const src = read("apps/web/src/lib/format.ts");
    expect(src).toMatch(/export function formatDayAxisTick/);
    expect(src).toMatch(/export function formatWeekAxisTick/);
    expect(src).toMatch(
      /export function (?:formatDurationAxisTick|durationAxisTicks)/,
    );
  });
});
