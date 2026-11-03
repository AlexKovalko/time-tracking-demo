import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * employee-search-week-calendar · structure contracts (AC-2…AC-8)
 * Expected RED until frontend-dev lands async Combobox + week resource matrix.
 */
const root = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(root, rel);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

describe("structure · employee-search-week-calendar (AC-2…AC-8)", () => {
  it("api.listEmployees accepts optional q (AC-2)", () => {
    const src = read("apps/web/src/lib/api.ts");
    // Client must forward q to GET /employees
    expect(src).toMatch(/listEmployees:\s*async\s*\(params\?\:\s*\{[^}]*\bq\?:/);
    expect(src).toMatch(/if\s*\(params\?\.q\)\s*q\.set\(["']q["']/);
  });

  it("EntriesSection / Timer stop using listAllEmployees as primary picker path (AC-2)", () => {
    const entries = read("apps/web/src/components/EntriesSection.tsx");
    const timer = read("apps/web/src/components/TimerSection.tsx");
    // Primary path must be listEmployees (with q), not full crawl
    expect(entries).not.toMatch(/queryFn:\s*api\.listAllEmployees/);
    expect(timer).not.toMatch(/queryFn:\s*api\.listAllEmployees/);
  });

  it("EmployeeCombobox supports async search / lazy pages / selection cache (AC-2, AC-3, AC-4)", () => {
    const src = read("apps/web/src/components/EmployeeCombobox.tsx");
    // Debounced server search hook surface (names may vary slightly)
    expect(src).toMatch(/onSearch|loadOptions|fetchEmployees|searchEmployees|listEmployees/);
    expect(src).toMatch(/debounce|DEBOUNCE|useDebounc/i);
    expect(src).toMatch(/hasMore|loadMore|onScroll|page\s*\+|nextPage/i);
    expect(src).toMatch(
      /selectionCache|selectedEmployee|cachedSelection|selectedLabel|getEmployee/,
    );
  });

  it("Combobox empty states expose distinct testids (AC-8)", () => {
    const src = read("apps/web/src/components/EmployeeCombobox.tsx");
    expect(src).toMatch(/data-testid=.*loading/i);
    expect(src).toMatch(/data-testid=.*(?:browse-)?empty/i);
    expect(src).toMatch(/data-testid=.*no-results/i);
  });

  it("week calendar uses resource rows (FIO left), not hour axis as sole Y (AC-5, AC-6)", () => {
    const src = read("apps/web/src/components/EntriesSection.tsx");
    expect(src).toMatch(/entries-employee-row|entries-week-resource|week-resource/i);
    // Week mode must not render hour axis as the week layout
    // (day mode may still reference entries-hour-axis)
    expect(src).toMatch(/calMode\s*===\s*["']week["']/);
    // Resource cell / chip contract
    expect(src).toMatch(
      /entries-week-cell|entries-employee-day|week-cell|employee×day|employee-day-cell/i,
    );
  });

  it("week create via empty cell click (or documented equivalent) (AC-7)", () => {
    const src = read("apps/web/src/components/EntriesSection.tsx");
    expect(src).toMatch(/entries-week-cell/);
    expect(src).toMatch(/openCreate/);
    // Week path must gate create from resource cell, not only day drag
    expect(src).toMatch(/calMode === "week"/);
  });
});
