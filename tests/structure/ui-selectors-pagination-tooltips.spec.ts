import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * qa write · ui-selectors-pagination-tooltips (#84)
 * Structure / locale contract from ux.md — RED until frontend-dev lands keys + testids.
 */
const root = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(root, rel);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

function localeKeys(rel: string): Set<string> {
  const json = JSON.parse(read(rel)) as Record<string, string>;
  return new Set(Object.keys(json));
}

describe("structure · ui-selectors-pagination-tooltips locales (AC-1…6)", () => {
  const required = [
    // AC-1
    "employees.department.unknown",
    "employees.department.placeholder",
    // AC-2
    "pagination.pageSize",
    // AC-4 / AC-5
    "combobox.employee.placeholder",
    "combobox.employee.loading",
    "combobox.employee.empty",
    "combobox.employee.noResults",
    "combobox.employee.clear",
    // AC-3 / AC-6
    "charts.tooltip.a11y",
  ];

  for (const locale of ["en", "ru"] as const) {
    it(`${locale}.json has UX contract keys`, () => {
      const keys = localeKeys(`apps/web/src/locales/${locale}.json`);
      const missing = required.filter((k) => !keys.has(k));
      expect(missing).toEqual([]);
    });
  }
});

describe("structure · ui-selectors-pagination-tooltips source testids (AC-1…6)", () => {
  it("PaginationBar exposes {testId}-page-size (AC-2)", () => {
    const src = read("apps/web/src/components/PaginationBar.tsx");
    expect(src).toMatch(/page-size|pageSize|onLimitChange/);
    expect(src).toMatch(/\$\{testId\}-page-size|`\$\{testId\}-page-size`/);
  });

  it("department select content testid present (AC-1)", () => {
    const src = read("apps/web/src/components/EmployeesSection.tsx");
    expect(src).toMatch(/employee-department-select-content/);
    expect(src).toMatch(/employees\.department\.unknown|department\.unknown/);
  });

  it("entries filter uses Combobox input/list testids (AC-4)", () => {
    const src = read("apps/web/src/components/EntriesSection.tsx");
    expect(src).toMatch(/entries-filter-employee-input/);
    expect(src).toMatch(/entries-filter-employee-list/);
  });

  it("entries create uses Combobox testids (AC-5)", () => {
    const src = read("apps/web/src/components/EntriesSection.tsx");
    expect(src).toMatch(/entries-create-employee/);
    expect(src).toMatch(/entries-create-employee-input/);
  });

  it("charts expose chart-tooltip (AC-3 / AC-6)", () => {
    const compact = read("apps/web/src/components/CompactBarChart.tsx");
    expect(compact).toMatch(/chart-tooltip/);
    // Dense rotated labels must be removed
    expect(compact).not.toMatch(/rotate\(-40/);
    const pie = read("apps/web/src/components/PieChart.tsx");
    expect(pie).toMatch(/chart-tooltip/);
  });
});
