import { describe, expect, it } from "vitest";
import { getReportCharts } from "../helpers/api-client";

/**
 * AC-27…AC-30 (#58–#61) — charts API for report surfaces.
 */
describe("API · report charts (AC-27…30)", () => {
  it("returns over-time series for day and week buckets (AC-27 #58)", async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);

    for (const bucket of ["day", "week"] as const) {
      const { status, body } = await getReportCharts({
        from: fromIso,
        to: toIso,
        bucket,
      });
      expect(status).toBe(200);
      const payload = body as {
        overTime?: unknown[];
        series?: unknown[];
        buckets?: unknown[];
      };
      const series =
        payload.overTime ?? payload.series ?? payload.buckets ?? null;
      expect(Array.isArray(series)).toBe(true);
      expect((series as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("returns breakdown for employees and departments (AC-28 #59)", async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);

    for (const breakdown of ["employees", "departments"] as const) {
      const { status, body } = await getReportCharts({
        from: fromIso,
        to: toIso,
        breakdown,
      });
      expect(status).toBe(200);
      const payload = body as {
        breakdown?: unknown[];
        items?: unknown[];
        series?: unknown[];
      };
      const series =
        payload.breakdown ?? payload.items ?? payload.series ?? null;
      expect(Array.isArray(series)).toBe(true);
      expect((series as unknown[]).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("empty far-future window yields empty series (AC-29 #60)", async () => {
    const { status, body } = await getReportCharts({
      from: "2099-01-01",
      to: "2099-01-02",
      bucket: "day",
      breakdown: "employees",
    });
    expect(status).toBe(200);
    const payload = body as Record<string, unknown>;
    const candidates = ["overTime", "series", "buckets", "breakdown", "items"]
      .map((k) => payload[k])
      .filter(Array.isArray) as unknown[][];
    expect(candidates.length).toBeGreaterThan(0);
    for (const arr of candidates) {
      expect(arr.every((row) => {
        if (!row || typeof row !== "object") return true;
        const v = row as { total?: number; totalDurationSeconds?: number; value?: number };
        const n = v.total ?? v.totalDurationSeconds ?? v.value ?? 0;
        return !n;
      })).toBe(true);
    }
  });
});
