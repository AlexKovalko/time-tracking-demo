import { describe, expect, it } from "vitest";
import * as format from "../../apps/web/src/lib/format";

/**
 * AC-44 (#78) — week bucket labels for Report + Profile over-time week mode.
 * Must NOT be ISO `2026-W44`. Format:
 *   ru: `DD.MM.YYYY - DD.MM.YYYY (N неделя)`
 *   en: `DD.MM.YYYY - DD.MM.YYYY (week N)` (date span may stay DD.MM or locale dates —
 *       product locks date span as DD.MM.YYYY in the Russian example; eng uses shared util).
 */
describe("formatWeekBucketLabel · AC-44 (#78)", () => {
  it("exports formatWeekBucketLabel (or alias) from lib/format", () => {
    const fn =
      (format as { formatWeekBucketLabel?: unknown }).formatWeekBucketLabel ??
      (format as { formatWeekBucket?: unknown }).formatWeekBucket;
    expect(typeof fn).toBe("function");
  });

  it("formats ru week span with week number, not ISO Www", () => {
    const fn = (format as {
      formatWeekBucketLabel?: (
        weekStart: Date | string,
        locale: string,
      ) => string;
    }).formatWeekBucketLabel;
    expect(fn).toBeTypeOf("function");
    // Week containing 2026-10-28 → ISO week 44 (Mon 27.10 – Sun 02.11)
    const label = fn!(new Date(2026, 9, 27), "ru");
    expect(label).not.toMatch(/\d{4}-W\d{2}/);
    expect(label).toMatch(
      /\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}\s*\(\d+\s*неделя\)/,
    );
    expect(label).toContain("44 неделя");
  });

  it("formats en week span with (week N)", () => {
    const fn = (format as {
      formatWeekBucketLabel?: (
        weekStart: Date | string,
        locale: string,
      ) => string;
    }).formatWeekBucketLabel;
    expect(fn).toBeTypeOf("function");
    const label = fn!(new Date(2026, 9, 27), "en");
    expect(label).not.toMatch(/\d{4}-W\d{2}/);
    expect(label.toLowerCase()).toMatch(/\(week\s*44\)/);
  });
});
