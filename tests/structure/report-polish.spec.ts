import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("structure · report polish (donut total + pagination + month defaults)", () => {
  it("locales include charts.breakdown.totalHours", () => {
    const ru = JSON.parse(read("apps/web/src/locales/ru.json"));
    const en = JSON.parse(read("apps/web/src/locales/en.json"));
    expect(ru["charts.breakdown.totalHours"]).toMatch(/всего часов/i);
    expect(en["charts.breakdown.totalHours"]).toMatch(/total hours/i);
  });

  it("ReportSection defaults to current month and paginates entries", () => {
    const src = read("apps/web/src/components/ReportSection.tsx");
    expect(src).toMatch(/startOfMonthIso/);
    expect(src).toMatch(/endOfMonthIso/);
    expect(src).toMatch(/listTimeEntries/);
    expect(src).toMatch(/PaginationBar/);
    expect(src).toMatch(/report-pagination/);
    expect(src).not.toMatch(/report-totals/);
  });

  it("PieChart shows center total and side color legend list", () => {
    const src = read("apps/web/src/components/PieChart.tsx");
    expect(src).toMatch(/\$\{testId\}-total/);
    expect(src).toMatch(/totalCaption|charts\.breakdown\.totalHours/);
    expect(src).toMatch(/role="list"/);
    expect(src).toMatch(/data-segment-label/);
  });
});
