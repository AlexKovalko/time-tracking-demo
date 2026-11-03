import { describe, expect, it } from "vitest";
import { formatDuration } from "../../apps/web/src/lib/format";

/**
 * AC-31 (#62) — closed-duration display via shared util.
 * Live running clock may stay hh:mm:ss elsewhere; this util must use ч/м/с · h/m/s.
 * Expected RED until frontend-dev implements locale-aware formatDuration.
 */
describe("formatDuration · AC-31 (#62)", () => {
  it("formats hours-only without zero minutes/seconds (ru/en)", () => {
    expect(formatDuration(48 * 3600, "ru")).toBe("48ч");
    expect(formatDuration(48 * 3600, "en")).toBe("48h");
  });

  it("formats hours + minutes (ru/en)", () => {
    expect(formatDuration(4 * 3600 + 20 * 60, "ru")).toBe("4ч 20м");
    expect(formatDuration(4 * 3600 + 20 * 60, "en")).toBe("4h 20m");
  });

  it("formats minutes + seconds without zero hours (ru/en)", () => {
    expect(formatDuration(2 * 60 + 5, "ru")).toBe("2м 5с");
    expect(formatDuration(2 * 60 + 5, "en")).toBe("2m 5s");
  });

  it("formats seconds-only and zero (ru/en)", () => {
    expect(formatDuration(45, "ru")).toBe("45с");
    expect(formatDuration(45, "en")).toBe("45s");
    expect(formatDuration(0, "ru")).toBe("0с");
    expect(formatDuration(0, "en")).toBe("0s");
  });

  it("never prefixes with 0ч / 0h when hours are zero", () => {
    expect(formatDuration(90, "ru")).not.toMatch(/^0ч/);
    expect(formatDuration(90, "en")).not.toMatch(/^0h/);
    expect(formatDuration(90, "ru")).toBe("1м 30с");
    expect(formatDuration(90, "en")).toBe("1m 30s");
  });

  it("does not return empty string or hh:mm:ss for closed durations", () => {
    const ru = formatDuration(3661, "ru");
    expect(ru.length).toBeGreaterThan(0);
    expect(ru).not.toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(ru).toBe("1ч 1м 1с");
  });
});
