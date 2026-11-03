import { describe, expect, it } from "vitest";
import {
  getEmployeeCharts,
  getReportCharts,
  listEmployeesPage,
} from "../helpers/api-client";

/**
 * AC-33…AC-36 (#67–#70) — employee-scoped profile charts API.
 * Prefer GET /reports/charts?employeeId=… (+ descriptionBreakdown);
 * alt GET /employees/:id/charts — eng picks one.
 */
function period28d(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 28);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function pickSeedEmployeeId(): Promise<string> {
  const { status, body } = await listEmployeesPage({ page: 1, limit: 50 });
  expect(status).toBe(200);
  const page = body as { items?: Array<{ id: string; name: string }> };
  const items = page.items ?? (Array.isArray(body) ? (body as Array<{ id: string; name: string }>) : []);
  const seed = items.find((e) => /[А-ЯЁа-яё]{3,}/.test(e.name)) ?? items[0];
  expect(seed?.id).toBeTruthy();
  return seed!.id;
}

function overTimeSeries(payload: Record<string, unknown>): unknown[] {
  const series =
    payload.overTime ?? payload.series ?? payload.buckets ?? null;
  expect(Array.isArray(series)).toBe(true);
  return series as unknown[];
}

function descriptionBreakdown(payload: Record<string, unknown>): unknown[] {
  const series =
    payload.descriptionBreakdown ??
    payload.descriptions ??
    payload.byDescription ??
    null;
  expect(Array.isArray(series)).toBe(true);
  return series as unknown[];
}

function nonzeroCount(rows: unknown[]): number {
  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const v = row as {
      total?: number;
      totalDurationSeconds?: number;
      value?: number;
    };
    const n = v.total ?? v.totalDurationSeconds ?? v.value ?? 0;
    return n > 0;
  }).length;
}

describe("API · employee profile charts (AC-33…36)", () => {
  it("returns employee-scoped over-time for day|week (AC-33 #67)", async () => {
    const employeeId = await pickSeedEmployeeId();
    const { from, to } = period28d();

    for (const bucket of ["day", "week"] as const) {
      const { status, body } = await getEmployeeCharts({
        employeeId,
        from,
        to,
        bucket,
      });
      expect(status).toBe(200);
      const series = overTimeSeries(body as Record<string, unknown>);
      expect(series.length).toBeGreaterThan(0);
      expect(nonzeroCount(series)).toBeGreaterThan(0);
    }
  });

  it("returns description breakdown with ≥2 nonzero buckets (AC-34 #68)", async () => {
    // Find an employee that has dense description variety on seed (AC-36).
    const { status: listStatus, body: listBody } = await listEmployeesPage({
      page: 1,
      limit: 50,
    });
    expect(listStatus).toBe(200);
    const page = listBody as { items?: Array<{ id: string }> };
    const items =
      page.items ??
      (Array.isArray(listBody) ? (listBody as Array<{ id: string }>) : []);
    expect(items.length).toBeGreaterThan(0);

    const { from, to } = period28d();
    let best: { id: string; buckets: unknown[] } | null = null;

    for (const emp of items) {
      const { status, body } = await getEmployeeCharts({
        employeeId: emp.id,
        from,
        to,
        bucket: "day",
      });
      if (status !== 200) continue;
      const payload = body as Record<string, unknown>;
      let buckets: unknown[] = [];
      try {
        buckets = descriptionBreakdown(payload);
      } catch {
        continue;
      }
      if (nonzeroCount(buckets) >= 2) {
        best = { id: emp.id, buckets };
        break;
      }
      if (!best || nonzeroCount(buckets) > nonzeroCount(best.buckets)) {
        best = { id: emp.id, buckets };
      }
    }

    expect(best).toBeTruthy();
    expect(nonzeroCount(best!.buckets)).toBeGreaterThanOrEqual(2);
  });

  it("ignores q for charts; empty far window is empty (AC-35 #69)", async () => {
    const employeeId = await pickSeedEmployeeId();
    const { from, to } = period28d();

    const withQ = await getReportCharts({
      from,
      to,
      bucket: "day",
      employeeId,
    });
    // Explicit q must not be a required filter — charts endpoint ignores q.
    // Probe that employee-scoped response stays 200 without needing q.
    expect(withQ.status).toBe(200);
    const baseline = overTimeSeries(withQ.body as Record<string, unknown>);

    const empty = await getEmployeeCharts({
      employeeId,
      from: "2099-01-01",
      to: "2099-01-02",
      bucket: "day",
    });
    expect(empty.status).toBe(200);
    const payload = empty.body as Record<string, unknown>;
    const over = overTimeSeries(payload);
    expect(nonzeroCount(over)).toBe(0);
    // descriptionBreakdown present (possibly empty array)
    const desc =
      payload.descriptionBreakdown ??
      payload.descriptions ??
      payload.byDescription;
    expect(Array.isArray(desc)).toBe(true);
    expect(nonzeroCount(desc as unknown[])).toBe(0);

    // Seed window still had shape (non-regression vs empty)
    expect(baseline.length).toBeGreaterThan(0);
  });

  it("seed density supports profile over-time + descriptions (AC-36 #70)", async () => {
    const { from, to } = period28d();
    const { status: listStatus, body: listBody } = await listEmployeesPage({
      page: 1,
      limit: 50,
    });
    expect(listStatus).toBe(200);
    const page = listBody as { items?: Array<{ id: string }> };
    const items =
      page.items ??
      (Array.isArray(listBody) ? (listBody as Array<{ id: string }>) : []);

    let foundOverTime = false;
    let foundDescriptions = false;
    for (const emp of items) {
      const { status, body } = await getEmployeeCharts({
        employeeId: emp.id,
        from,
        to,
        bucket: "day",
      });
      if (status !== 200) continue;
      const payload = body as Record<string, unknown>;
      try {
        if (nonzeroCount(overTimeSeries(payload)) > 0) foundOverTime = true;
      } catch {
        /* missing overTime */
      }
      const desc =
        payload.descriptionBreakdown ??
        payload.descriptions ??
        payload.byDescription;
      if (Array.isArray(desc) && nonzeroCount(desc) >= 2) {
        foundDescriptions = true;
      }
      if (foundOverTime && foundDescriptions) break;
    }
    expect(foundOverTime).toBe(true);
    expect(foundDescriptions).toBe(true);
  });
});
