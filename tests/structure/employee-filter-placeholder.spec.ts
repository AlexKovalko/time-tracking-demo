import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * employee-filter-placeholder · structure contracts (AC-1, AC-2)
 * User clarification: no «Все сотрудники» as committed value or list option;
 * do not repurpose entries.filter.employeeAll as Combobox placeholder.
 * Expected RED until FE updates EmployeeCombobox / EntriesSection filter.
 */
const root = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(root, rel);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

describe("structure · employee-filter-placeholder (AC-1, AC-2)", () => {
  it("EmployeeCombobox does not commit allLabel as closed value when value==='all' (AC-1)", () => {
    const src = read("apps/web/src/components/EmployeeCombobox.tsx");
    // Bug: allowAll && value === "all" ? allLabel — filled committed display
    expect(src).not.toMatch(
      /allowAll\s*&&\s*value\s*===\s*["']all["']\s*\?\s*allLabel/,
    );
    // Bug: resolveSelected / commit still paint allLabel into the input
    expect(src).not.toMatch(/setSelectedLabel\(allLabel\)/);
    expect(src).not.toMatch(/setQuery\(allLabel\)/);
  });

  it("entries filter does not pass entries.filter.employeeAll as placeholder (AC-1)", () => {
    const entries = read("apps/web/src/components/EntriesSection.tsx");
    const filterBlock = entries.match(
      /testIdPrefix=["']entries-filter-employee["'][\s\S]{0,500}?allowAll/,
    );
    expect(filterBlock?.[0] ?? "").not.toMatch(
      /placeholder=\{t\(["']entries\.filter\.employeeAll["']\)\}/,
    );
    // Default combobox.employee.placeholder remains (no employeeAll override)
    expect(filterBlock?.[0] ?? "").not.toMatch(/placeholder=/);
  });

  it("allowAll does not inject «all» list option with allLabel (AC-2)", () => {
    const src = read("apps/web/src/components/EmployeeCombobox.tsx");
    expect(src).not.toMatch(
      /rows\.push\(\{\s*id:\s*["']all["']\s*,\s*label:\s*allLabel/,
    );
  });
});
