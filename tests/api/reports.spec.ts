import { describe, expect, it } from "vitest";
import {
  createEmployee,
  deleteEmployee,
  emptyReportWindow,
  exportReportCsv,
  getReportSummary,
  listTimeEntries,
  startTimer,
  stopTimer,
  todayIsoDate,
} from "../helpers/api-client";

/**
 * AC-8, AC-9, AC-10, AC-18 — report list, totals, empty, CSV.
 */
describe("API · reports (AC-8, AC-9, AC-10, AC-18)", () => {
  it("returns empty list and zero summary for empty period (AC-10)", async () => {
    const { from, to } = emptyReportWindow();
    const entries = await listTimeEntries(from, to);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(0);

    const summary = await getReportSummary(from, to);
    expect(summary.status).toBe(200);
    const body = summary.body as {
      employees: unknown[];
      grandTotalSeconds: number;
    };
    expect(Array.isArray(body.employees)).toBe(true);
    expect(body.employees.length).toBe(0);
    expect(body.grandTotalSeconds).toBe(0);
  });

  it("lists entries and per-employee totals for a period with data (AC-8, AC-9)", async () => {
    const name = `API Report ${Date.now()}`;
    const { body } = await createEmployee(name);
    const employee = body as { id: string };

    await startTimer({ employeeId: employee.id, description: "Reportable" });
    // Brief sleep so durationSeconds > 0
    await new Promise((r) => setTimeout(r, 1100));
    await stopTimer({ employeeId: employee.id });

    const day = todayIsoDate();
    const entries = await listTimeEntries(day, day);
    expect(entries.some((e) => e.description === "Reportable")).toBe(true);

    const summary = await getReportSummary(day, day);
    expect(summary.status).toBe(200);
    const bodySummary = summary.body as {
      employees: Array<{
        employeeId: string;
        totalDurationSeconds: number;
      }>;
      grandTotalSeconds: number;
    };
    const row = bodySummary.employees.find((e) => e.employeeId === employee.id);
    expect(row).toBeTruthy();
    expect(row!.totalDurationSeconds).toBeGreaterThan(0);
    expect(bodySummary.grandTotalSeconds).toBeGreaterThan(0);

    await deleteEmployee(employee.id);
  });

  it("exports CSV for a period (AC-18)", async () => {
    const name = `API CSV ${Date.now()}`;
    const { body } = await createEmployee(name);
    const employee = body as { id: string };
    await startTimer({ employeeId: employee.id, description: "CSV row" });
    await stopTimer({ employeeId: employee.id });

    const day = todayIsoDate();
    const csv = await exportReportCsv(day, day);
    expect(csv.status).toBe(200);
    expect(csv.contentType ?? "").toMatch(/text\/csv|octet-stream/i);
    expect(csv.text.length).toBeGreaterThan(0);
    expect(csv.text.toLowerCase()).toMatch(/csv row|description|employee/i);

    await deleteEmployee(employee.id);
  });
});
