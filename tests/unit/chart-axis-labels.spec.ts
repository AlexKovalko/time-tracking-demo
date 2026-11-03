import { describe, expect, it } from "vitest";
import * as format from "../../apps/web/src/lib/format";

/**
 * chart-axis-labels · #103
 * AC-1 (#104) day X ticks DD.MM
 * AC-2 (#105) week X ticks = ISO week number
 * AC-3 (#106) Y-axis hour/duration scale tick labels
 *
 * Helpers are expected on lib/format; CompactBarChart must use them for
 * visible axis text (tooltip may keep richer labels).
 */
type FormatModule = typeof format & {
  formatDayAxisTick?: (day: Date | string) => string;
  formatWeekAxisTick?: (weekStart: Date | string) => string;
  formatDurationAxisTick?: (totalSeconds: number, locale?: string) => string;
  durationAxisTicks?: (maxSeconds: number, maxTicks?: number) => number[];
};

const fmt = format as FormatModule;

describe("chart-axis-labels · format helpers (AC-1…3 · #104–#106)", () => {
  describe("AC-1 · formatDayAxisTick → DD.MM", () => {
    it("exports formatDayAxisTick", () => {
      expect(typeof fmt.formatDayAxisTick).toBe("function");
    });

    it("formats ISO day as DD.MM without year", () => {
      expect(fmt.formatDayAxisTick).toBeTypeOf("function");
      const label = fmt.formatDayAxisTick!("2026-05-12");
      expect(label).toBe("12.05");
      expect(label).not.toMatch(/\d{4}/);
      expect(label).not.toBe("12.05.2026");
    });

    it("formats Date as DD.MM without year", () => {
      expect(fmt.formatDayAxisTick).toBeTypeOf("function");
      // Local calendar 12 May 2026
      const label = fmt.formatDayAxisTick!(new Date(2026, 4, 12));
      expect(label).toMatch(/^\d{2}\.\d{2}$/);
      expect(label).toBe("12.05");
      expect(label).not.toMatch(/\d{4}/);
    });
  });

  describe("AC-2 · formatWeekAxisTick → ISO week number", () => {
    it("exports formatWeekAxisTick", () => {
      expect(typeof fmt.formatWeekAxisTick).toBe("function");
    });

    it("returns ISO week number, not full AC-44 span", () => {
      expect(fmt.formatWeekAxisTick).toBeTypeOf("function");
      // Mon 2026-10-27 → ISO week 44
      const label = fmt.formatWeekAxisTick!(new Date(2026, 9, 27));
      expect(label).toMatch(/^44$/);
      expect(label).not.toMatch(/\d{4}-W\d{2}/);
      expect(label).not.toMatch(/\d{2}\.\d{2}\.\d{4}/);
      expect(label.toLowerCase()).not.toMatch(/неделя|week/);
    });

    it("accepts ISO week / date string buckets", () => {
      expect(fmt.formatWeekAxisTick).toBeTypeOf("function");
      expect(fmt.formatWeekAxisTick!("2026-W44")).toBe("44");
      expect(fmt.formatWeekAxisTick!("2026-10-27")).toBe("44");
    });
  });

  describe("AC-3 · duration / hour Y-axis tick helpers", () => {
    it("exports durationAxisTicks and/or formatDurationAxisTick", () => {
      const hasTicks = typeof fmt.durationAxisTicks === "function";
      const hasFormat = typeof fmt.formatDurationAxisTick === "function";
      expect(hasTicks || hasFormat).toBe(true);
    });

    it("durationAxisTicks spans 0..max with readable hour steps", () => {
      expect(fmt.durationAxisTicks).toBeTypeOf("function");
      const max = 8 * 3600;
      const ticks = fmt.durationAxisTicks!(max);
      expect(Array.isArray(ticks)).toBe(true);
      expect(ticks!.length).toBeGreaterThanOrEqual(2);
      expect(ticks![0]).toBe(0);
      expect(ticks![ticks!.length - 1]).toBe(max);
      // Strictly increasing
      for (let i = 1; i < ticks!.length; i++) {
        expect(ticks![i]).toBeGreaterThan(ticks![i - 1]!);
      }
    });

    it("formatDurationAxisTick yields short hour/duration labels (no tooltip-only)", () => {
      expect(fmt.formatDurationAxisTick).toBeTypeOf("function");
      const ru = fmt.formatDurationAxisTick!(4 * 3600, "ru");
      const en = fmt.formatDurationAxisTick!(4 * 3600, "en");
      expect(ru.length).toBeGreaterThan(0);
      expect(en.length).toBeGreaterThan(0);
      // Readable scale: hours unit present, not empty and not full HH:MM:SS clock
      expect(ru).toMatch(/4\s*ч|4ч/);
      expect(en).toMatch(/4\s*h|4h/);
      expect(ru).not.toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
